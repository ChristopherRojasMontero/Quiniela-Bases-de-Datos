-- Eliminamos todo lo existente para poder correr el script desde cero sin errores.
-- El orden importa: primero vistas, luego tablas, luego funciones y tipos.
-- CASCADE elimina automáticamente los objetos que dependan de cada uno.
DROP VIEW     IF EXISTS v_ranking_quiniela, v_historial_pronosticos CASCADE;
DROP TABLE    IF EXISTS puntuacion, pronostico, inscripcion, quiniela_partido, quiniela, partido, equipo, usuario CASCADE;
DROP FUNCTION IF EXISTS fn_validar_creador_quiniela() CASCADE;
DROP FUNCTION IF EXISTS fn_validar_inscripcion_quiniela() CASCADE;
DROP FUNCTION IF EXISTS fn_validar_pronostico_tiempo() CASCADE;
DROP FUNCTION IF EXISTS fn_calcular_puntuacion() CASCADE;
DROP TYPE     IF EXISTS tipo_usuario_enum, estado_quiniela_enum, modalidad_enum, tipo_puntuacion_enum, estado_partido_enum CASCADE;

-- Tipos enumerados: restringen los valores posibles de ciertas columnas.
-- Evitan inconsistencias como 'Abierta' vs 'abierta' vs 'ABIERTA'.
CREATE TYPE tipo_usuario_enum    AS ENUM ('administrador', 'jugador');
CREATE TYPE estado_quiniela_enum AS ENUM ('abierta', 'cerrada', 'finalizada');
CREATE TYPE modalidad_enum       AS ENUM ('publica', 'privada');
CREATE TYPE tipo_puntuacion_enum AS ENUM ('basico', 'exacto', 'racha');
CREATE TYPE estado_partido_enum  AS ENUM ('pendiente', 'en_curso', 'finalizado');

-- Usuarios del sistema. Hay dos roles: administrador y jugador.
-- La contraseña se guarda como hash bcrypt, nunca en texto plano.
-- El campo "activo" permite deshabilitar usuarios sin borrarlos.
-- SERIAL genera el id automáticamente (1, 2, 3...).
-- UNIQUE garantiza que no existan dos filas con el mismo valor en esa columna.
-- CONSTRAINT le da nombre a una regla para identificarla fácilmente cuando falla.
CREATE TABLE usuario (
    id_usuario          SERIAL            PRIMARY KEY,
    nombre_completo     VARCHAR(150)      NOT NULL,
    correo_electronico  VARCHAR(255)      NOT NULL UNIQUE,
    nombre_usuario      VARCHAR(50)       NOT NULL UNIQUE,
    contrasena_hash     VARCHAR(255)      NOT NULL,
    fecha_nacimiento    DATE              NOT NULL,
    tipo_usuario        tipo_usuario_enum NOT NULL DEFAULT 'jugador',
    -- CURRENT_TIMESTAMP guarda automáticamente la fecha y hora exacta del momento.
    fecha_registro      TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo              BOOLEAN           NOT NULL DEFAULT TRUE,

    -- Valida el formato del correo con una expresión regular.
    CONSTRAINT chk_correo CHECK (correo_electronico ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'),
    -- El nombre de usuario debe tener al menos 3 caracteres.
    CONSTRAINT chk_nombre_usuario CHECK (LENGTH(nombre_usuario) >= 3)
);

-- Equipos de fútbol. Se separan de PARTIDO para no repetir el nombre
-- del equipo en cada partido que juegue (normalización de datos).
CREATE TABLE equipo (
    id_equipo   SERIAL       PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    pais        VARCHAR(100) NOT NULL,
    logo_url    VARCHAR(500)
);

-- Partidos entre dos equipos. Tiene dos FOREIGN KEY a EQUIPO (local y visitante).
-- REFERENCES le dice a PostgreSQL que el valor debe existir en la tabla referenciada.
-- ON DELETE RESTRICT impide borrar un equipo si tiene partidos asociados.
-- Los goles usan SMALLINT en lugar de INT porque un marcador nunca supera los 32767,
-- lo que ahorra espacio en disco comparado con INT.
-- Los goles son NULL mientras el partido no ha finalizado (NULL != 0).
CREATE TABLE partido (
    id_partido          SERIAL              PRIMARY KEY,
    id_equipo_local     INT                 NOT NULL,
    id_equipo_visitante INT                 NOT NULL,
    fecha_hora          TIMESTAMP           NOT NULL,
    estado              estado_partido_enum NOT NULL DEFAULT 'pendiente',
    goles_local         SMALLINT            DEFAULT NULL,
    goles_visitante     SMALLINT            DEFAULT NULL,

    CONSTRAINT fk_equipo_local
        FOREIGN KEY (id_equipo_local)     REFERENCES equipo (id_equipo) ON DELETE RESTRICT,
    CONSTRAINT fk_equipo_visitante
        FOREIGN KEY (id_equipo_visitante) REFERENCES equipo (id_equipo) ON DELETE RESTRICT,

    -- Un partido no puede jugarse contra sí mismo.
    CONSTRAINT chk_equipos_distintos CHECK (id_equipo_local != id_equipo_visitante),
    CONSTRAINT chk_goles_local       CHECK (goles_local IS NULL OR goles_local >= 0),
    CONSTRAINT chk_goles_visitante   CHECK (goles_visitante IS NULL OR goles_visitante >= 0),

    -- Si el partido no está finalizado, los goles deben ser NULL obligatoriamente.
    CONSTRAINT chk_goles_solo_finalizado CHECK (
        estado = 'finalizado' OR (goles_local IS NULL AND goles_visitante IS NULL)
    )
);

-- Quiniela: competencia de pronósticos creada por un administrador.
-- Se vincula a partidos a través de la tabla QUINIELA_PARTIDO.
-- Se definieron varios tipos de puntuación pero solo se programó 'basico'.
CREATE TABLE quiniela (
    id_quiniela              SERIAL                PRIMARY KEY,
    nombre                   VARCHAR(150)          NOT NULL UNIQUE,
    descripcion              TEXT,
    reglas                   TEXT,
    fecha_inicio_inscripcion TIMESTAMP             NOT NULL,
    fecha_cierre_inscripcion TIMESTAMP             NOT NULL,
    estado                   estado_quiniela_enum  NOT NULL DEFAULT 'abierta',
    modalidad                modalidad_enum        NOT NULL DEFAULT 'publica',
    tipo_puntuacion          tipo_puntuacion_enum  NOT NULL DEFAULT 'basico',
    id_creador               INT                   NOT NULL,

    CONSTRAINT fk_creador
        FOREIGN KEY (id_creador) REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
    -- La fecha de cierre siempre debe ser posterior a la de inicio.
    CONSTRAINT chk_fechas_inscripcion CHECK (fecha_cierre_inscripcion > fecha_inicio_inscripcion)
);

-- Trigger que impide que un jugador cree quinielas.
-- RETURNS TRIGGER indica que esta función será usada por un trigger.
-- Los $$ son delimitadores del cuerpo de la función (como comillas pero sin conflictos internos).
-- LANGUAGE plpgsql es el lenguaje procedural de PostgreSQL que permite IF, LOOP, variables, etc.
-- NEW es la fila que se está intentando insertar o modificar.
-- RAISE EXCEPTION cancela la operación y muestra el mensaje de error.
CREATE OR REPLACE FUNCTION fn_validar_creador_quiniela()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT tipo_usuario FROM usuario WHERE id_usuario = NEW.id_creador) != 'administrador' THEN
        RAISE EXCEPTION 'Solo los administradores pueden crear quinielas.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- BEFORE INSERT OR UPDATE: se ejecuta antes de insertar o modificar una quiniela.
-- Si la función lanza excepción, la operación se cancela.
-- FOR EACH ROW: se ejecuta una vez por cada fila afectada.
CREATE TRIGGER trg_validar_creador_quiniela
BEFORE INSERT OR UPDATE ON quiniela
FOR EACH ROW EXECUTE FUNCTION fn_validar_creador_quiniela();

-- Tabla intermedia que resuelve la relación muchos-a-muchos entre QUINIELA y PARTIDO.
-- Una quiniela tiene varios partidos y un partido puede estar en varias quinielas.
-- La PK compuesta (id_quiniela, id_partido) evita duplicados automáticamente.
-- ON DELETE CASCADE: si se borra la quiniela, se borran sus filas acá también.
CREATE TABLE quiniela_partido (
    id_quiniela INT NOT NULL,
    id_partido  INT NOT NULL,

    PRIMARY KEY (id_quiniela, id_partido),

    CONSTRAINT fk_qp_quiniela FOREIGN KEY (id_quiniela) REFERENCES quiniela (id_quiniela) ON DELETE CASCADE,
    CONSTRAINT fk_qp_partido  FOREIGN KEY (id_partido)  REFERENCES partido  (id_partido)  ON DELETE RESTRICT
);

-- Registra qué usuarios participan en qué quinielas.
-- UNIQUE(id_usuario, id_quiniela): la combinación debe ser única, no cada campo por separado.
-- Esto impide que un usuario se inscriba dos veces en la misma quiniela.
-- CHECK(acepto_reglas = TRUE): no se puede inscribir sin aceptar las reglas.
CREATE TABLE inscripcion (
    id_inscripcion    SERIAL    PRIMARY KEY,
    id_usuario        INT       NOT NULL,
    id_quiniela       INT       NOT NULL,
    fecha_inscripcion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    acepto_reglas     BOOLEAN   NOT NULL DEFAULT FALSE,

    CONSTRAINT uq_inscripcion   UNIQUE (id_usuario, id_quiniela),
    CONSTRAINT fk_insc_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuario  (id_usuario)  ON DELETE CASCADE,
    CONSTRAINT fk_insc_quiniela FOREIGN KEY (id_quiniela) REFERENCES quiniela (id_quiniela) ON DELETE CASCADE,
    CONSTRAINT chk_acepto_reglas CHECK (acepto_reglas = TRUE)
);

-- Trigger que impide inscribirse en quinielas que no están abiertas.
CREATE OR REPLACE FUNCTION fn_validar_inscripcion_quiniela()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT estado FROM quiniela WHERE id_quiniela = NEW.id_quiniela) != 'abierta' THEN
        RAISE EXCEPTION 'Solo se puede inscribir en quinielas con estado abierta.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_inscripcion
BEFORE INSERT ON inscripcion
FOR EACH ROW EXECUTE FUNCTION fn_validar_inscripcion_quiniela();

-- Pronóstico de un usuario para un partido dentro de una quiniela.
-- UNIQUE(id_usuario, id_partido, id_quiniela): un solo pronóstico por usuario por partido por quiniela.
-- Los goles predichos también usan SMALLINT por la misma razón que en PARTIDO.
CREATE TABLE pronostico (
    id_pronostico            SERIAL    PRIMARY KEY,
    id_usuario               INT       NOT NULL,
    id_partido               INT       NOT NULL,
    id_quiniela              INT       NOT NULL,
    goles_local_predicho     SMALLINT  NOT NULL,
    goles_visitante_predicho SMALLINT  NOT NULL,
    fecha_ingreso            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_pronostico    UNIQUE (id_usuario, id_partido, id_quiniela),
    CONSTRAINT fk_pron_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuario  (id_usuario)  ON DELETE CASCADE,
    CONSTRAINT fk_pron_partido  FOREIGN KEY (id_partido)  REFERENCES partido  (id_partido)  ON DELETE RESTRICT,
    CONSTRAINT fk_pron_quiniela FOREIGN KEY (id_quiniela) REFERENCES quiniela (id_quiniela) ON DELETE CASCADE,
    CONSTRAINT chk_goles_local_predicho     CHECK (goles_local_predicho >= 0),
    CONSTRAINT chk_goles_visitante_predicho CHECK (goles_visitante_predicho >= 0)
);

-- Trigger que bloquea pronósticos en partidos que ya iniciaron o finalizaron.
CREATE OR REPLACE FUNCTION fn_validar_pronostico_tiempo()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT estado FROM partido WHERE id_partido = NEW.id_partido) IN ('en_curso', 'finalizado') THEN
        RAISE EXCEPTION 'No se puede registrar un pronóstico: el partido ya inició o finalizó.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_pronostico_tiempo
BEFORE INSERT OR UPDATE ON pronostico
FOR EACH ROW EXECUTE FUNCTION fn_validar_pronostico_tiempo();

-- Puntuación obtenida por cada participante en cada partido.
-- La llena automáticamente el trigger fn_calcular_puntuacion, nunca se inserta manualmente.
-- UNIQUE(id_inscripcion, id_partido) evita calcular dos veces los puntos del mismo partido.
CREATE TABLE puntuacion (
    id_puntuacion    SERIAL    PRIMARY KEY,
    id_inscripcion   INT       NOT NULL,
    id_partido       INT       NOT NULL,
    puntos_obtenidos SMALLINT  NOT NULL DEFAULT 0,
    fecha_calculo    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_puntuacion       UNIQUE (id_inscripcion, id_partido),
    CONSTRAINT fk_punt_inscripcion FOREIGN KEY (id_inscripcion) REFERENCES inscripcion (id_inscripcion) ON DELETE CASCADE,
    CONSTRAINT fk_punt_partido     FOREIGN KEY (id_partido)     REFERENCES partido     (id_partido)     ON DELETE RESTRICT,
    CONSTRAINT chk_puntos CHECK (puntos_obtenidos >= 0)
);

-- Función que calcula los puntos cuando un partido finaliza.
-- AFTER UPDATE: se ejecuta después del UPDATE, cuando los goles ya están guardados en la BD.
-- DECLARE es donde se declaran las variables locales antes de usarlas.
-- RECORD puede guardar una fila completa de cualquier consulta.
-- NEW y OLD representan la fila después y antes del UPDATE respectivamente.
-- Método básico implementado:
--   3 puntos si el marcador predicho es exacto.
--   1 punto  si acertó el ganador o que habría empate.
--   0 puntos si falló completamente.
CREATE OR REPLACE FUNCTION fn_calcular_puntuacion()
RETURNS TRIGGER AS $$
DECLARE
    rec              RECORD;   -- Variable que guarda cada pronóstico del loop
    v_puntos         SMALLINT; -- Puntos calculados para el pronóstico actual
    v_id_inscripcion INT;      -- ID de inscripción del usuario en esa quiniela
BEGIN
    -- Solo actuamos cuando el partido pasa de cualquier estado a 'finalizado'.
    IF NEW.estado = 'finalizado' AND OLD.estado != 'finalizado' THEN

        -- Recorremos todos los pronósticos registrados para este partido.
        FOR rec IN
            SELECT p.id_usuario, p.id_quiniela,
                   p.goles_local_predicho, p.goles_visitante_predicho
            FROM pronostico p
            WHERE p.id_partido = NEW.id_partido
        LOOP
            -- Comparamos el pronóstico con el resultado real.
            IF rec.goles_local_predicho = NEW.goles_local
               AND rec.goles_visitante_predicho = NEW.goles_visitante THEN
                v_puntos := 3; -- Marcador exacto
            ELSIF
                (rec.goles_local_predicho > rec.goles_visitante_predicho AND NEW.goles_local > NEW.goles_visitante)
                OR (rec.goles_local_predicho < rec.goles_visitante_predicho AND NEW.goles_local < NEW.goles_visitante)
                OR (rec.goles_local_predicho = rec.goles_visitante_predicho AND NEW.goles_local = NEW.goles_visitante)
            THEN
                v_puntos := 1; -- Ganador o empate correcto
            ELSE
                v_puntos := 0; -- Fallo
            END IF;

            -- Buscamos la inscripción del usuario en esa quiniela.
            SELECT id_inscripcion INTO v_id_inscripcion
            FROM inscripcion
            WHERE id_usuario = rec.id_usuario AND id_quiniela = rec.id_quiniela;

            -- Insertamos la puntuación.
            -- ON CONFLICT DO UPDATE: si ya existe (por corrección de resultado), la actualizamos.
            -- EXCLUDED hace referencia a los valores que se intentaron insertar.
            INSERT INTO puntuacion (id_inscripcion, id_partido, puntos_obtenidos)
            VALUES (v_id_inscripcion, NEW.id_partido, v_puntos)
            ON CONFLICT (id_inscripcion, id_partido)
            DO UPDATE SET puntos_obtenidos = EXCLUDED.puntos_obtenidos,
                          fecha_calculo    = CURRENT_TIMESTAMP;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calcular_puntuacion
AFTER UPDATE ON partido
FOR EACH ROW EXECUTE FUNCTION fn_calcular_puntuacion();

-- Vista del ranking por quiniela.
-- Una vista es una consulta guardada que se comporta como tabla virtual.
-- No almacena datos, los calcula cada vez que se consulta.
-- JOIN combina filas de dos tablas donde se cumpla la condición ON.
-- LEFT JOIN incluye todas las filas de la izquierda aunque no haya coincidencia a la derecha
-- (jugadores sin puntos aún aparecen igual con puntaje = 0).
-- RANK() OVER (PARTITION BY id_quiniela): calcula la posición dentro de cada quiniela.
-- Los empates reciben la misma posición.
-- COALESCE(valor, 0): si el valor es NULL lo reemplaza por 0.
CREATE OR REPLACE VIEW v_ranking_quiniela AS
SELECT
    q.id_quiniela,
    q.nombre                             AS nombre_quiniela,
    u.id_usuario,
    u.nombre_usuario,
    u.nombre_completo,
    COALESCE(SUM(p.puntos_obtenidos), 0) AS puntaje_total,
    RANK() OVER (
        PARTITION BY q.id_quiniela
        ORDER BY COALESCE(SUM(p.puntos_obtenidos), 0) DESC
    ) AS posicion
FROM quiniela q
JOIN inscripcion i     ON i.id_quiniela     = q.id_quiniela
JOIN usuario u         ON u.id_usuario      = i.id_usuario
LEFT JOIN puntuacion p ON p.id_inscripcion  = i.id_inscripcion
GROUP BY q.id_quiniela, q.nombre, u.id_usuario, u.nombre_usuario, u.nombre_completo
ORDER BY q.id_quiniela, posicion;

-- Vista del historial de pronósticos.
-- Hacemos JOIN dos veces con EQUIPO usando alias distintos (el y ev)
-- porque un partido tiene dos referencias a la misma tabla (local y visitante).
-- Incluye id_partido para que el frontend pueda filtrar los ya pronosticados.
CREATE OR REPLACE VIEW v_historial_pronosticos AS
SELECT
    u.nombre_usuario,
    q.nombre                         AS quiniela,
    el.nombre                        AS equipo_local,
    ev.nombre                        AS equipo_visitante,
    pr.id_partido,
    pr.goles_local_predicho,
    pr.goles_visitante_predicho,
    pa.goles_local                   AS resultado_local,
    pa.goles_visitante               AS resultado_visitante,
    pa.estado                        AS estado_partido,
    COALESCE(pu.puntos_obtenidos, 0) AS puntos
FROM pronostico pr
JOIN usuario u       ON u.id_usuario      = pr.id_usuario
JOIN quiniela q      ON q.id_quiniela     = pr.id_quiniela
JOIN partido pa      ON pa.id_partido     = pr.id_partido
JOIN equipo el       ON el.id_equipo      = pa.id_equipo_local
JOIN equipo ev       ON ev.id_equipo      = pa.id_equipo_visitante
LEFT JOIN inscripcion i  ON i.id_usuario  = pr.id_usuario  AND i.id_quiniela  = pr.id_quiniela
LEFT JOIN puntuacion pu  ON pu.id_inscripcion = i.id_inscripcion AND pu.id_partido = pr.id_partido
ORDER BY u.nombre_usuario, q.nombre, pa.fecha_hora;

-- Índices para acelerar las consultas más frecuentes.
-- Sin índice PostgreSQL lee toda la tabla fila por fila.
-- Con índice salta directamente a las filas relevantes.
-- Solo indexamos columnas que se usan frecuentemente en WHERE y JOIN.
CREATE INDEX idx_partido_estado         ON partido    (estado);
CREATE INDEX idx_partido_fecha          ON partido    (fecha_hora);
CREATE INDEX idx_quiniela_estado        ON quiniela   (estado);
CREATE INDEX idx_inscripcion_quiniela   ON inscripcion(id_quiniela);
CREATE INDEX idx_pronostico_partido     ON pronostico (id_partido);
CREATE INDEX idx_pronostico_usuario     ON pronostico (id_usuario);
CREATE INDEX idx_puntuacion_inscripcion ON puntuacion (id_inscripcion);

-- Datos de prueba. Todos los usuarios tienen contraseña: password
INSERT INTO usuario (nombre_completo, correo_electronico, nombre_usuario, contrasena_hash, fecha_nacimiento, tipo_usuario)
VALUES
    ('Admin Sistema',  'admin@quiniela.com',   'admin',      '$2b$12$MrIyhNG9fLZQeGw7H1aEPuTaTMDpdei5.gG0lVsE0nO5BU/jurYzK', '1985-03-15', 'administrador'),
    ('Carlos Mora',    'cmora@email.com',       'cmora',      '$2b$12$MrIyhNG9fLZQeGw7H1aEPuTaTMDpdei5.gG0lVsE0nO5BU/jurYzK', '1995-07-22', 'jugador'),
    ('Ana Rodríguez',  'arodriguez@email.com',  'arodriguez', '$2b$12$MrIyhNG9fLZQeGw7H1aEPuTaTMDpdei5.gG0lVsE0nO5BU/jurYzK', '1998-11-10', 'jugador'),
    ('Luis Jiménez',   'ljimenez@email.com',    'ljimenez',   '$2b$12$MrIyhNG9fLZQeGw7H1aEPuTaTMDpdei5.gG0lVsE0nO5BU/jurYzK', '1992-04-05', 'jugador');

INSERT INTO equipo (nombre, pais) VALUES
    ('Costa Rica', 'Costa Rica'),
    ('México',     'México'),
    ('Argentina',  'Argentina'),
    ('Brasil',     'Brasil'),
    ('Colombia',   'Colombia'),
    ('Uruguay',    'Uruguay');

INSERT INTO partido (id_equipo_local, id_equipo_visitante, fecha_hora, estado) VALUES
    (1, 2, '2026-06-10 18:00:00', 'pendiente'),
    (3, 4, '2026-06-10 21:00:00', 'pendiente'),
    (5, 6, '2026-06-11 18:00:00', 'pendiente');

INSERT INTO quiniela (nombre, descripcion, reglas, fecha_inicio_inscripcion, fecha_cierre_inscripcion, estado, modalidad, tipo_puntuacion, id_creador)
VALUES (
    'Copa América 2026',
    'Quiniela oficial para la fase de grupos de la Copa América 2026',
    '3 puntos por marcador exacto, 1 punto por acertar ganador o empate.',
    '2026-05-18 00:00:00',
    '2026-06-09 23:59:59',
    'abierta',
    'publica',
    'basico',
    1
);

-- Asignamos los 3 partidos a la quiniela.
INSERT INTO quiniela_partido (id_quiniela, id_partido) VALUES (1,1),(1,2),(1,3);

-- Los 3 jugadores quedan inscritos desde el inicio.
INSERT INTO inscripcion (id_usuario, id_quiniela, acepto_reglas) VALUES
    (2, 1, TRUE),
    (3, 1, TRUE),
    (4, 1, TRUE);

-- Pronósticos iniciales de cada jugador para los 3 partidos.
INSERT INTO pronostico (id_usuario, id_partido, id_quiniela, goles_local_predicho, goles_visitante_predicho) VALUES
    (2, 1, 1, 2, 1),
    (2, 2, 1, 1, 1),
    (2, 3, 1, 0, 2),
    (3, 1, 1, 1, 0),
    (3, 2, 1, 3, 1),
    (3, 3, 1, 1, 1),
    (4, 1, 1, 2, 1),
    (4, 2, 1, 0, 2),
    (4, 3, 1, 2, 0);