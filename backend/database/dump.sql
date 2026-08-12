--
-- PostgreSQL database dump
--

\restrict H8FtLFHulxsUHmVuxMdxOw0PpHMHK3wC1KQz0XjU6t8xfkRe46R5Ro7lhw5eYe6

-- Dumped from database version 18.4 (Debian 18.4-1.pgdg13+1)
-- Dumped by pg_dump version 18.4 (Debian 18.4-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.sectors DROP CONSTRAINT IF EXISTS sectors_parent_id_foreign;
ALTER TABLE IF EXISTS ONLY public.sector_submission DROP CONSTRAINT IF EXISTS sector_submission_submission_id_foreign;
ALTER TABLE IF EXISTS ONLY public.sector_submission DROP CONSTRAINT IF EXISTS sector_submission_sector_id_foreign;
DROP INDEX IF EXISTS public.sessions_user_id_index;
DROP INDEX IF EXISTS public.sessions_last_activity_index;
ALTER TABLE IF EXISTS ONLY public.submissions DROP CONSTRAINT IF EXISTS submissions_session_id_unique;
ALTER TABLE IF EXISTS ONLY public.submissions DROP CONSTRAINT IF EXISTS submissions_pkey;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.sectors DROP CONSTRAINT IF EXISTS sectors_pkey;
ALTER TABLE IF EXISTS ONLY public.sector_submission DROP CONSTRAINT IF EXISTS sector_submission_submission_id_sector_id_unique;
ALTER TABLE IF EXISTS ONLY public.migrations DROP CONSTRAINT IF EXISTS migrations_pkey;
ALTER TABLE IF EXISTS public.submissions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.migrations ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.submissions_id_seq;
DROP TABLE IF EXISTS public.submissions;
DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.sectors;
DROP TABLE IF EXISTS public.sector_submission;
DROP SEQUENCE IF EXISTS public.migrations_id_seq;
DROP TABLE IF EXISTS public.migrations;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: sector_submission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sector_submission (
    submission_id bigint NOT NULL,
    sector_id bigint NOT NULL
);


--
-- Name: sectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sectors (
    id bigint NOT NULL,
    parent_id bigint,
    name character varying(255) NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


--
-- Name: submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submissions (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    session_id character varying(64) NOT NULL,
    agreed_to_terms boolean NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.submissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.submissions_id_seq OWNED BY public.submissions.id;


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: submissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions ALTER COLUMN id SET DEFAULT nextval('public.submissions_id_seq'::regclass);


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.migrations (id, migration, batch) FROM stdin;
1	0001_01_01_000000_create_sessions_table	1
2	2026_08_07_090120_create_sectors_table	1
3	2026_08_07_090131_create_submissions_table	1
4	2026_08_07_090223_create_sector_submission_table	1
\.


--
-- Data for Name: sector_submission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sector_submission (submission_id, sector_id) FROM stdin;
\.


--
-- Data for Name: sectors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sectors (id, parent_id, name) FROM stdin;
1	\N	Manufacturing
19	1	Construction materials
18	1	Electronics and Optics
6	1	Food and Beverage
342	6	Bakery & confectionery products
43	6	Beverages
42	6	Fish & fish products
40	6	Meat & meat products
39	6	Milk & dairy products
437	6	Other
378	6	Sweets & snack food
13	1	Furniture
389	13	Bathroom/sauna
385	13	Bedroom
390	13	Children’s room
98	13	Kitchen
101	13	Living room
392	13	Office
394	13	Other (Furniture)
341	13	Outdoor
99	13	Project furniture
12	1	Machinery
94	12	Machinery components
91	12	Machinery equipment/tools
224	12	Manufacture of machinery
97	12	Maritime
271	97	Aluminium and steel workboats
269	97	Boat/Yacht building
230	97	Ship repair and conversion
93	12	Metal structures
508	12	Other
227	12	Repair and maintenance service
11	1	Metalworking
67	11	Construction of metal structures
263	11	Houses and buildings
267	11	Metal products
542	11	Metal works
75	542	CNC-machining
62	542	Forgings, Fasteners
69	542	Gas, Plasma, Laser cutting
66	542	MIG, TIG, Aluminum welding
9	1	Plastic and Rubber
54	9	Packaging
556	9	Plastic goods
559	9	Plastic processing technology
55	559	Blowing
57	559	Moulding
53	559	Plastics welding and processing
560	9	Plastic profiles
5	1	Printing
148	5	Advertising
150	5	Book/Periodicals printing
145	5	Labelling and packaging printing
7	1	Textile and Clothing
44	7	Clothing
45	7	Textile
8	1	Wood
337	8	Other (Wood)
51	8	Wooden building materials
47	8	Wooden houses
3	\N	Other
37	3	Creative industries
29	3	Energy technology
33	3	Environment
2	\N	Service
25	2	Business services
35	2	Engineering
28	2	Information Technology and Telecommunications
581	28	Data processing, Web portals, E-marketing
576	28	Programming, Consultancy
121	28	Software, Hardware
122	28	Telecommunications
22	2	Tourism
141	2	Translation services
21	2	Transport and Logistics
111	21	Air
114	21	Rail
112	21	Road
113	21	Water
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (id, user_id, ip_address, user_agent, payload, last_activity) FROM stdin;
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.submissions (id, name, session_id, agreed_to_terms, created_at, updated_at) FROM stdin;
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 4, true);


--
-- Name: submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.submissions_id_seq', 1, false);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: sector_submission sector_submission_submission_id_sector_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_submission
    ADD CONSTRAINT sector_submission_submission_id_sector_id_unique UNIQUE (submission_id, sector_id);


--
-- Name: sectors sectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sectors
    ADD CONSTRAINT sectors_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_session_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_session_id_unique UNIQUE (session_id);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: sector_submission sector_submission_sector_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_submission
    ADD CONSTRAINT sector_submission_sector_id_foreign FOREIGN KEY (sector_id) REFERENCES public.sectors(id);


--
-- Name: sector_submission sector_submission_submission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sector_submission
    ADD CONSTRAINT sector_submission_submission_id_foreign FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE;


--
-- Name: sectors sectors_parent_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sectors
    ADD CONSTRAINT sectors_parent_id_foreign FOREIGN KEY (parent_id) REFERENCES public.sectors(id);


--
-- PostgreSQL database dump complete
--

\unrestrict H8FtLFHulxsUHmVuxMdxOw0PpHMHK3wC1KQz0XjU6t8xfkRe46R5Ro7lhw5eYe6

