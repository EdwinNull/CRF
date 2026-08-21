--
-- PostgreSQL database dump
--

\restrict oPpIkME9I2Nd6sQcCO1lpEAW80BxngadDWf9mbujzaf23d9MS3uiu4JOpPaiVwv

-- Dumped from database version 15.18 (Homebrew)
-- Dumped by pg_dump version 15.18 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.visits DROP CONSTRAINT IF EXISTS visits_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.concomitant_meds DROP CONSTRAINT IF EXISTS concomitant_meds_patient_id_fkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.adverse_events DROP CONSTRAINT IF EXISTS adverse_events_patient_id_fkey;
DROP INDEX IF EXISTS public.ix_visits_patient_id;
DROP INDEX IF EXISTS public.ix_visits_id;
DROP INDEX IF EXISTS public.ix_users_username;
DROP INDEX IF EXISTS public.ix_users_id;
DROP INDEX IF EXISTS public.ix_patients_screening_no;
DROP INDEX IF EXISTS public.ix_patients_randomization_no;
DROP INDEX IF EXISTS public.ix_patients_id;
DROP INDEX IF EXISTS public.ix_patients_center_id;
DROP INDEX IF EXISTS public.ix_concomitant_meds_patient_id;
DROP INDEX IF EXISTS public.ix_concomitant_meds_id;
DROP INDEX IF EXISTS public.ix_audit_logs_user_id;
DROP INDEX IF EXISTS public.ix_audit_logs_id;
DROP INDEX IF EXISTS public.ix_audit_logs_created_at;
DROP INDEX IF EXISTS public.ix_adverse_events_patient_id;
DROP INDEX IF EXISTS public.ix_adverse_events_id;
DROP INDEX IF EXISTS public.idx_patient_visit;
DROP INDEX IF EXISTS public.idx_center_status;
ALTER TABLE IF EXISTS ONLY public.visits DROP CONSTRAINT IF EXISTS visits_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.patients DROP CONSTRAINT IF EXISTS patients_pkey;
ALTER TABLE IF EXISTS ONLY public.concomitant_meds DROP CONSTRAINT IF EXISTS concomitant_meds_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.alembic_version DROP CONSTRAINT IF EXISTS alembic_version_pkc;
ALTER TABLE IF EXISTS ONLY public.adverse_events DROP CONSTRAINT IF EXISTS adverse_events_pkey;
ALTER TABLE IF EXISTS public.visits ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.patients ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.concomitant_meds ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.adverse_events ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.visits_id_seq;
DROP TABLE IF EXISTS public.visits;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.patients_id_seq;
DROP TABLE IF EXISTS public.patients;
DROP SEQUENCE IF EXISTS public.concomitant_meds_id_seq;
DROP TABLE IF EXISTS public.concomitant_meds;
DROP SEQUENCE IF EXISTS public.audit_logs_id_seq;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.alembic_version;
DROP SEQUENCE IF EXISTS public.adverse_events_id_seq;
DROP TABLE IF EXISTS public.adverse_events;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: adverse_events; Type: TABLE; Schema: public; Owner: crf_user
--

CREATE TABLE public.adverse_events (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    seq_no integer NOT NULL,
    event_name character varying(200) NOT NULL,
    description text,
    start_date character varying(20) NOT NULL,
    end_date character varying(20),
    is_ongoing boolean,
    severity integer NOT NULL,
    drug_relation integer NOT NULL,
    drug_measure integer NOT NULL,
    other_measure integer NOT NULL,
    other_measure_detail character varying(200),
    outcome integer NOT NULL,
    is_sae boolean,
    sae_type integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.adverse_events OWNER TO crf_user;

--
-- Name: adverse_events_id_seq; Type: SEQUENCE; Schema: public; Owner: crf_user
--

CREATE SEQUENCE public.adverse_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.adverse_events_id_seq OWNER TO crf_user;

--
-- Name: adverse_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: crf_user
--

ALTER SEQUENCE public.adverse_events_id_seq OWNED BY public.adverse_events.id;


--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: crf_user
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO crf_user;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: crf_user
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    action character varying(50) NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_id integer,
    details json,
    ip_address character varying(50),
    created_at timestamp without time zone
);


ALTER TABLE public.audit_logs OWNER TO crf_user;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: crf_user
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.audit_logs_id_seq OWNER TO crf_user;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: crf_user
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: concomitant_meds; Type: TABLE; Schema: public; Owner: crf_user
--

CREATE TABLE public.concomitant_meds (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    seq_no integer NOT NULL,
    drug_name character varying(200) NOT NULL,
    indication character varying(200),
    dosage_form character varying(100),
    dosage_amount character varying(200),
    start_date character varying(20) NOT NULL,
    end_date character varying(20),
    is_ongoing boolean,
    drug_relation character varying(100),
    remark text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.concomitant_meds OWNER TO crf_user;

--
-- Name: concomitant_meds_id_seq; Type: SEQUENCE; Schema: public; Owner: crf_user
--

CREATE SEQUENCE public.concomitant_meds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.concomitant_meds_id_seq OWNER TO crf_user;

--
-- Name: concomitant_meds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: crf_user
--

ALTER SEQUENCE public.concomitant_meds_id_seq OWNED BY public.concomitant_meds.id;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: crf_user
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    screening_no character varying(20) NOT NULL,
    randomization_no character varying(20),
    name_abbr character varying(10) NOT NULL,
    center_id character varying(10) NOT NULL,
    gender character varying(10) NOT NULL,
    age integer NOT NULL,
    height integer,
    weight integer,
    enrollment_date character varying(20) NOT NULL,
    status character varying(20) NOT NULL,
    withdrawal_reason character varying(50),
    withdrawal_date character varying(20),
    completion_summary json,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.patients OWNER TO crf_user;

--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: crf_user
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.patients_id_seq OWNER TO crf_user;

--
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: crf_user
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: crf_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    full_name character varying(100),
    role character varying(20) NOT NULL,
    center_id character varying(10) NOT NULL,
    is_active boolean,
    created_at timestamp without time zone
);


ALTER TABLE public.users OWNER TO crf_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: crf_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO crf_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: crf_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: visits; Type: TABLE; Schema: public; Owner: crf_user
--

CREATE TABLE public.visits (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    visit_no character varying(10) NOT NULL,
    visit_date character varying(20),
    status character varying(20) NOT NULL,
    data json NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.visits OWNER TO crf_user;

--
-- Name: visits_id_seq; Type: SEQUENCE; Schema: public; Owner: crf_user
--

CREATE SEQUENCE public.visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.visits_id_seq OWNER TO crf_user;

--
-- Name: visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: crf_user
--

ALTER SEQUENCE public.visits_id_seq OWNED BY public.visits.id;


--
-- Name: adverse_events id; Type: DEFAULT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.adverse_events ALTER COLUMN id SET DEFAULT nextval('public.adverse_events_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: concomitant_meds id; Type: DEFAULT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.concomitant_meds ALTER COLUMN id SET DEFAULT nextval('public.concomitant_meds_id_seq'::regclass);


--
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: visits id; Type: DEFAULT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.visits ALTER COLUMN id SET DEFAULT nextval('public.visits_id_seq'::regclass);


--
-- Data for Name: adverse_events; Type: TABLE DATA; Schema: public; Owner: crf_user
--

COPY public.adverse_events (id, patient_id, seq_no, event_name, description, start_date, end_date, is_ongoing, severity, drug_relation, drug_measure, other_measure, other_measure_detail, outcome, is_sae, sae_type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: crf_user
--

COPY public.alembic_version (version_num) FROM stdin;
474244523232
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: crf_user
--

COPY public.audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: concomitant_meds; Type: TABLE DATA; Schema: public; Owner: crf_user
--

COPY public.concomitant_meds (id, patient_id, seq_no, drug_name, indication, dosage_form, dosage_amount, start_date, end_date, is_ongoing, drug_relation, remark, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: crf_user
--

COPY public.patients (id, screening_no, randomization_no, name_abbr, center_id, gender, age, height, weight, enrollment_date, status, withdrawal_reason, withdrawal_date, completion_summary, created_at, updated_at) FROM stdin;
19	01003	\N	WXY	01	男	39	171	65	2026-07-28	screening	\N	\N	\N	2026-08-11 05:42:19.721045	2026-08-11 05:42:19.721046
22	02003	\N	TDH	02	男	52	170	68	2026-08-05	screening	\N	\N	\N	2026-08-11 05:42:20.253259	2026-08-11 05:42:20.25326
24	03002	\N	MHG	03	男	48	176	80	2026-06-15	screening	\N	\N	\N	2026-08-11 05:42:20.605905	2026-08-11 05:42:20.605906
28	04003	\N	JXB	04	女	31	162	55	2026-08-09	screening	\N	\N	\N	2026-08-11 05:42:21.31985	2026-08-11 05:42:21.319851
17	01001	001	ZHLS	01	男	41	175	72	2026-05-20	completed	\N	\N	\N	2026-08-11 05:42:19.367598	2026-08-11 08:56:52.808401
18	01002	002	LRY	01	女	28	163	56	2026-06-02	treatment	\N	\N	\N	2026-08-11 05:42:19.544814	2026-08-11 08:56:52.815548
20	02001	003	WXH	02	男	45	178	78	2026-05-18	followup	\N	\N	\N	2026-08-11 05:42:19.899265	2026-08-11 08:56:52.819926
21	02002	004	FMC	02	女	36	160	52	2026-04-11	completed	\N	\N	\N	2026-08-11 05:42:20.075646	2026-08-11 08:56:52.823437
23	03001	005	CLX	03	女	33	165	60	2026-03-10	withdrawn	\N	\N	\N	2026-08-11 05:42:20.428984	2026-08-11 08:56:52.826924
25	03003	006	QYY	03	女	26	158	48	2026-07-01	treatment	\N	\N	\N	2026-08-11 05:42:20.782695	2026-08-11 08:56:52.830234
26	04001	008	HYQ	04	男	36	180	82	2026-06-22	followup	\N	\N	\N	2026-08-11 05:42:20.969211	2026-08-11 08:56:52.834808
27	04002	009	SLF	04	男	43	173	74	2026-04-28	completed	\N	\N	\N	2026-08-11 05:42:21.144515	2026-08-11 08:56:52.838387
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: crf_user
--

COPY public.users (id, username, hashed_password, full_name, role, center_id, is_active, created_at) FROM stdin;
3	admin	$2b$12$BXj6K/HgdAd9fJOfaIIG3Owb12FCQWY3H9/Jmp/VL0OzacJC7ZI72	系统管理员	admin	01	t	2026-08-11 05:19:14.159324
4	doctor01	$2b$12$wycRzPIXtXx4.gt/9U0ak..gzz8Z2CACNcFG7b291/2hC8M9BDS6m	王医师(01中心)	doctor	01	t	2026-08-11 05:19:14.159327
5	doctor02	$2b$12$1ns53cUyClsPLX70nkjSIOQMAXm.oamj2Yg2EVdm7ygHeOt2BfDMS	李医师(02中心)	doctor	02	t	2026-08-11 05:19:14.159328
6	doctor03	$2b$12$DmYkwK3KygSHTMBSakSHT.cp6QTRzM5ZZjtyCGfVlNevIUF6m0H/a	张医师(03中心)	doctor	03	t	2026-08-11 05:19:14.159328
7	doctor04	$2b$12$xIBUE.QJq2wGeKYn82IOVuCMjhyDN9MkUVU5ZI/GpDmOcK9/ZkUqO	刘医师(04中心)	doctor	04	t	2026-08-11 05:19:14.159329
\.


--
-- Data for Name: visits; Type: TABLE DATA; Schema: public; Owner: crf_user
--

COPY public.visits (id, patient_id, visit_no, visit_date, status, data, created_at, updated_at) FROM stdin;
17	17	V1	\N	draft	{}	2026-08-11 05:42:19.369376	2026-08-11 05:42:19.369377
18	18	V1	\N	draft	{}	2026-08-11 05:42:19.546364	2026-08-11 05:42:19.546365
19	19	V1	\N	draft	{}	2026-08-11 05:42:19.722242	2026-08-11 05:42:19.722243
20	20	V1	\N	draft	{}	2026-08-11 05:42:19.900669	2026-08-11 05:42:19.90067
21	21	V1	\N	draft	{}	2026-08-11 05:42:20.077099	2026-08-11 05:42:20.077099
22	22	V1	\N	draft	{}	2026-08-11 05:42:20.254595	2026-08-11 05:42:20.254596
23	23	V1	\N	draft	{}	2026-08-11 05:42:20.429827	2026-08-11 05:42:20.429828
24	24	V1	\N	draft	{}	2026-08-11 05:42:20.606898	2026-08-11 05:42:20.606899
25	25	V1	\N	draft	{}	2026-08-11 05:42:20.783947	2026-08-11 05:42:20.783947
26	26	V1	\N	draft	{}	2026-08-11 05:42:20.970724	2026-08-11 05:42:20.970725
27	27	V1	\N	draft	{}	2026-08-11 05:42:21.145498	2026-08-11 05:42:21.145499
28	28	V1	\N	draft	{}	2026-08-11 05:42:21.321212	2026-08-11 05:42:21.321213
\.


--
-- Name: adverse_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: crf_user
--

SELECT pg_catalog.setval('public.adverse_events_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: crf_user
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: concomitant_meds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: crf_user
--

SELECT pg_catalog.setval('public.concomitant_meds_id_seq', 1, false);


--
-- Name: patients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: crf_user
--

SELECT pg_catalog.setval('public.patients_id_seq', 28, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: crf_user
--

SELECT pg_catalog.setval('public.users_id_seq', 7, true);


--
-- Name: visits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: crf_user
--

SELECT pg_catalog.setval('public.visits_id_seq', 28, true);


--
-- Name: adverse_events adverse_events_pkey; Type: CONSTRAINT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.adverse_events
    ADD CONSTRAINT adverse_events_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: concomitant_meds concomitant_meds_pkey; Type: CONSTRAINT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.concomitant_meds
    ADD CONSTRAINT concomitant_meds_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- Name: idx_center_status; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE INDEX idx_center_status ON public.patients USING btree (center_id, status);


--
-- Name: idx_patient_visit; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE INDEX idx_patient_visit ON public.visits USING btree (patient_id, visit_no);


--
-- Name: ix_adverse_events_id; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE INDEX ix_adverse_events_id ON public.adverse_events USING btree (id);


--
-- Name: ix_adverse_events_patient_id; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE INDEX ix_adverse_events_patient_id ON public.adverse_events USING btree (patient_id);


--
-- Name: ix_audit_logs_created_at; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE INDEX ix_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: ix_audit_logs_id; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE INDEX ix_audit_logs_id ON public.audit_logs USING btree (id);


--
-- Name: ix_audit_logs_user_id; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE INDEX ix_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: ix_concomitant_meds_id; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE INDEX ix_concomitant_meds_id ON public.concomitant_meds USING btree (id);


--
-- Name: ix_concomitant_meds_patient_id; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE INDEX ix_concomitant_meds_patient_id ON public.concomitant_meds USING btree (patient_id);


--
-- Name: ix_patients_center_id; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE INDEX ix_patients_center_id ON public.patients USING btree (center_id);


--
-- Name: ix_patients_id; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE INDEX ix_patients_id ON public.patients USING btree (id);


--
-- Name: ix_patients_randomization_no; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE UNIQUE INDEX ix_patients_randomization_no ON public.patients USING btree (randomization_no);


--
-- Name: ix_patients_screening_no; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE UNIQUE INDEX ix_patients_screening_no ON public.patients USING btree (screening_no);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: ix_visits_id; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE INDEX ix_visits_id ON public.visits USING btree (id);


--
-- Name: ix_visits_patient_id; Type: INDEX; Schema: public; Owner: crf_user
--

CREATE INDEX ix_visits_patient_id ON public.visits USING btree (patient_id);


--
-- Name: adverse_events adverse_events_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.adverse_events
    ADD CONSTRAINT adverse_events_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: concomitant_meds concomitant_meds_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.concomitant_meds
    ADD CONSTRAINT concomitant_meds_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: visits visits_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: crf_user
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- PostgreSQL database dump complete
--

\unrestrict oPpIkME9I2Nd6sQcCO1lpEAW80BxngadDWf9mbujzaf23d9MS3uiu4JOpPaiVwv

