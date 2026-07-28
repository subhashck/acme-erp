--
-- PostgreSQL database dump
--

\restrict ntQUUX0X8qNmQKhjcE2feqyQmERehY7Fs2cJt19uca8pAi68g2DhVbfScyqtDF4

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

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

--
-- Name: grn_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.grn_status AS ENUM (
    'draft',
    'posted',
    'correction'
);


ALTER TYPE public.grn_status OWNER TO postgres;

--
-- Name: payment_mode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_mode AS ENUM (
    'cash',
    'upi',
    'card',
    'rtgs',
    'cheque',
    'other'
);


ALTER TYPE public.payment_mode OWNER TO postgres;

--
-- Name: po_payment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.po_payment_status AS ENUM (
    'unpaid',
    'partial',
    'paid'
);


ALTER TYPE public.po_payment_status OWNER TO postgres;

--
-- Name: po_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.po_status AS ENUM (
    'open',
    'partial',
    'closed',
    'cancelled'
);


ALTER TYPE public.po_status OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp without time zone,
    "refreshTokenExpiresAt" timestamp without time zone,
    scope text,
    password text,
    "createdAt" timestamp without time zone NOT NULL,
    "updatedAt" timestamp without time zone NOT NULL
);


ALTER TABLE public.account OWNER TO postgres;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    department_id integer NOT NULL,
    scheduled_at timestamp without time zone NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'Waiting'::text NOT NULL,
    token text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.appointments OWNER TO postgres;

--
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.appointments_id_seq OWNER TO postgres;

--
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    date text NOT NULL,
    check_in text,
    check_out text,
    status text DEFAULT 'Present'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.attendance OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendance_id_seq OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: banks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.banks (
    id integer NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.banks OWNER TO postgres;

--
-- Name: banks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.banks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.banks_id_seq OWNER TO postgres;

--
-- Name: banks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.banks_id_seq OWNED BY public.banks.id;


--
-- Name: biometric_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.biometric_mappings (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    biometric_code text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.biometric_mappings OWNER TO postgres;

--
-- Name: biometric_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.biometric_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.biometric_mappings_id_seq OWNER TO postgres;

--
-- Name: biometric_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.biometric_mappings_id_seq OWNED BY public.biometric_mappings.id;


--
-- Name: consultant_rates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultant_rates (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    base_rate numeric(12,2) DEFAULT '500'::numeric NOT NULL,
    doctor_share_percent numeric(12,2) DEFAULT '70'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.consultant_rates OWNER TO postgres;

--
-- Name: consultant_rates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.consultant_rates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.consultant_rates_id_seq OWNER TO postgres;

--
-- Name: consultant_rates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.consultant_rates_id_seq OWNED BY public.consultant_rates.id;


--
-- Name: daily_additional_income; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_additional_income (
    id integer NOT NULL,
    report_id integer NOT NULL,
    label text NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE public.daily_additional_income OWNER TO postgres;

--
-- Name: daily_additional_income_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_additional_income_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_additional_income_id_seq OWNER TO postgres;

--
-- Name: daily_additional_income_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_additional_income_id_seq OWNED BY public.daily_additional_income.id;


--
-- Name: daily_closing_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_closing_reports (
    id integer NOT NULL,
    report_date text NOT NULL,
    created_by text NOT NULL,
    opening_balance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    bank_deposit numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    fund_handover_sir numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    fund_handover_madam numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_income numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total_expenditure numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    closing_balance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    cash_receipt_sir numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    cash_receipt_mam numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    cash_receipt_acon numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    cash_receipts_total numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    cash_receipts numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    bank_receipts_total numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    bank_receipt_sir numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    bank_receipt_sir_bank text,
    bank_deposits text,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    cash_denominations jsonb,
    reconciliation_tolerance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    soiled_notes text
);


ALTER TABLE public.daily_closing_reports OWNER TO postgres;

--
-- Name: daily_closing_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_closing_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_closing_reports_id_seq OWNER TO postgres;

--
-- Name: daily_closing_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_closing_reports_id_seq OWNED BY public.daily_closing_reports.id;


--
-- Name: daily_discounts_returns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_discounts_returns (
    id integer NOT NULL,
    report_id integer NOT NULL,
    label text NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE public.daily_discounts_returns OWNER TO postgres;

--
-- Name: daily_discounts_returns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_discounts_returns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_discounts_returns_id_seq OWNER TO postgres;

--
-- Name: daily_discounts_returns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_discounts_returns_id_seq OWNED BY public.daily_discounts_returns.id;


--
-- Name: daily_expenditures; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_expenditures (
    id integer NOT NULL,
    report_id integer NOT NULL,
    category text NOT NULL,
    details text NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    narration text
);


ALTER TABLE public.daily_expenditures OWNER TO postgres;

--
-- Name: daily_expenditures_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_expenditures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_expenditures_id_seq OWNER TO postgres;

--
-- Name: daily_expenditures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_expenditures_id_seq OWNED BY public.daily_expenditures.id;


--
-- Name: daily_ipd_admissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_ipd_admissions (
    id integer NOT NULL,
    report_id integer NOT NULL,
    patient_name text NOT NULL,
    type text NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE public.daily_ipd_admissions OWNER TO postgres;

--
-- Name: daily_ipd_admissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_ipd_admissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_ipd_admissions_id_seq OWNER TO postgres;

--
-- Name: daily_ipd_admissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_ipd_admissions_id_seq OWNED BY public.daily_ipd_admissions.id;


--
-- Name: daily_ipd_discharges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_ipd_discharges (
    id integer NOT NULL,
    report_id integer NOT NULL,
    patient_name text NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE public.daily_ipd_discharges OWNER TO postgres;

--
-- Name: daily_ipd_discharges_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_ipd_discharges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_ipd_discharges_id_seq OWNER TO postgres;

--
-- Name: daily_ipd_discharges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_ipd_discharges_id_seq OWNED BY public.daily_ipd_discharges.id;


--
-- Name: daily_payment_channels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_payment_channels (
    id integer NOT NULL,
    report_id integer NOT NULL,
    bank text NOT NULL,
    channel text NOT NULL,
    source_label text NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE public.daily_payment_channels OWNER TO postgres;

--
-- Name: daily_payment_channels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_payment_channels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_payment_channels_id_seq OWNER TO postgres;

--
-- Name: daily_payment_channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_payment_channels_id_seq OWNED BY public.daily_payment_channels.id;


--
-- Name: daily_pharmacy_income; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_pharmacy_income (
    id integer NOT NULL,
    report_id integer NOT NULL,
    ot_ward_total numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    acme_new_total numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    parking numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    coffee_shop numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    canteen_income numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    credit_card_charges_night numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    training_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    humankind_sales numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    misc_income text DEFAULT '[]'::text NOT NULL
);


ALTER TABLE public.daily_pharmacy_income OWNER TO postgres;

--
-- Name: daily_pharmacy_income_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_pharmacy_income_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_pharmacy_income_id_seq OWNER TO postgres;

--
-- Name: daily_pharmacy_income_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_pharmacy_income_id_seq OWNED BY public.daily_pharmacy_income.id;


--
-- Name: daily_service_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_service_lines (
    id integer NOT NULL,
    report_id integer NOT NULL,
    service_id integer,
    rate numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    quantity integer NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    is_night_entry boolean DEFAULT false NOT NULL,
    narration text
);


ALTER TABLE public.daily_service_lines OWNER TO postgres;

--
-- Name: daily_service_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_service_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_service_lines_id_seq OWNER TO postgres;

--
-- Name: daily_service_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_service_lines_id_seq OWNED BY public.daily_service_lines.id;


--
-- Name: daily_staff_advances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_staff_advances (
    id integer NOT NULL,
    report_id integer NOT NULL,
    staff_id integer,
    staff_name text NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE public.daily_staff_advances OWNER TO postgres;

--
-- Name: daily_staff_advances_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_staff_advances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_staff_advances_id_seq OWNER TO postgres;

--
-- Name: daily_staff_advances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_staff_advances_id_seq OWNED BY public.daily_staff_advances.id;


--
-- Name: department_leaders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.department_leaders (
    id integer NOT NULL,
    department_id integer NOT NULL,
    head_staff_id integer,
    subhead_staff_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.department_leaders OWNER TO postgres;

--
-- Name: department_leaders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.department_leaders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.department_leaders_id_seq OWNER TO postgres;

--
-- Name: department_leaders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.department_leaders_id_seq OWNED BY public.department_leaders.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name text NOT NULL,
    floor text NOT NULL,
    head text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departments_id_seq OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: designations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.designations (
    id integer NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.designations OWNER TO postgres;

--
-- Name: designations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.designations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.designations_id_seq OWNER TO postgres;

--
-- Name: designations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.designations_id_seq OWNED BY public.designations.id;


--
-- Name: encounters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.encounters (
    id integer NOT NULL,
    appointment_id integer NOT NULL,
    symptoms text NOT NULL,
    diagnosis text,
    vitals text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.encounters OWNER TO postgres;

--
-- Name: encounters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.encounters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.encounters_id_seq OWNER TO postgres;

--
-- Name: encounters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.encounters_id_seq OWNED BY public.encounters.id;


--
-- Name: expense_catalog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_catalog (
    id integer NOT NULL,
    category text NOT NULL,
    item_name text NOT NULL,
    default_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.expense_catalog OWNER TO postgres;

--
-- Name: expense_catalog_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expense_catalog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expense_catalog_id_seq OWNER TO postgres;

--
-- Name: expense_catalog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expense_catalog_id_seq OWNED BY public.expense_catalog.id;


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_categories (
    id integer NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.expense_categories OWNER TO postgres;

--
-- Name: expense_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expense_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expense_categories_id_seq OWNER TO postgres;

--
-- Name: expense_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expense_categories_id_seq OWNED BY public.expense_categories.id;


--
-- Name: grn_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grn_items (
    id integer NOT NULL,
    grn_id integer NOT NULL,
    po_item_id integer,
    item_id integer,
    item_name text,
    received_qty numeric(12,2) DEFAULT 0 NOT NULL,
    free_qty numeric(12,2) DEFAULT 0 NOT NULL,
    unit_rate numeric(12,2),
    gst_percent numeric(5,2),
    line_value numeric(12,2),
    batch text,
    expiry_date date,
    notes text
);


ALTER TABLE public.grn_items OWNER TO postgres;

--
-- Name: grn_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grn_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grn_items_id_seq OWNER TO postgres;

--
-- Name: grn_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grn_items_id_seq OWNED BY public.grn_items.id;


--
-- Name: grns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grns (
    id integer NOT NULL,
    po_id integer,
    vendor_id integer,
    no_po_reason text,
    grn_no text NOT NULL,
    grn_date date NOT NULL,
    date_of_delivery date,
    remarks text,
    status public.grn_status DEFAULT 'draft'::public.grn_status NOT NULL,
    created_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.grns OWNER TO postgres;

--
-- Name: grns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grns_id_seq OWNER TO postgres;

--
-- Name: grns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grns_id_seq OWNED BY public.grns.id;


--
-- Name: immunization_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.immunization_records (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    schedule_id integer,
    vaccine_code text NOT NULL,
    vaccine_name text NOT NULL,
    dose_label text NOT NULL,
    administered_at text NOT NULL,
    administered_by_staff_id integer,
    batch_no text,
    manufacturer text,
    site text,
    route text,
    adverse_event text,
    notes text,
    status text DEFAULT 'Administered'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.immunization_records OWNER TO postgres;

--
-- Name: immunization_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.immunization_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.immunization_records_id_seq OWNER TO postgres;

--
-- Name: immunization_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.immunization_records_id_seq OWNED BY public.immunization_records.id;


--
-- Name: immunization_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.immunization_schedules (
    id integer NOT NULL,
    vaccine_code text NOT NULL,
    vaccine_name text NOT NULL,
    dose_label text NOT NULL,
    beneficiary_type text DEFAULT 'Child'::text NOT NULL,
    due_age_days integer,
    due_age_label text NOT NULL,
    max_age_days integer,
    dose_amount text NOT NULL,
    route text NOT NULL,
    site text NOT NULL,
    applies_in text DEFAULT 'National'::text NOT NULL,
    source text DEFAULT 'India UIP National Immunization Schedule'::text NOT NULL,
    notes text,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.immunization_schedules OWNER TO postgres;

--
-- Name: immunization_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.immunization_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.immunization_schedules_id_seq OWNER TO postgres;

--
-- Name: immunization_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.immunization_schedules_id_seq OWNED BY public.immunization_schedules.id;


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_items (
    id integer NOT NULL,
    sku text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    unit text NOT NULL,
    quantity integer NOT NULL,
    reorder_level integer NOT NULL,
    supplier text NOT NULL,
    location text NOT NULL,
    expiry_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_items OWNER TO postgres;

--
-- Name: inventory_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_items_id_seq OWNER TO postgres;

--
-- Name: inventory_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_items_id_seq OWNED BY public.inventory_items.id;


--
-- Name: item_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item_types (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.item_types OWNER TO postgres;

--
-- Name: item_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.item_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.item_types_id_seq OWNER TO postgres;

--
-- Name: item_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.item_types_id_seq OWNED BY public.item_types.id;


--
-- Name: items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.items (
    id integer NOT NULL,
    name text NOT NULL,
    item_type_id integer NOT NULL,
    unit text NOT NULL,
    rate numeric(12,2) DEFAULT 0 NOT NULL,
    gst_percent numeric(5,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.items OWNER TO postgres;

--
-- Name: items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.items_id_seq OWNER TO postgres;

--
-- Name: items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.items_id_seq OWNED BY public.items.id;


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_requests (
    id integer NOT NULL,
    request_no text NOT NULL,
    staff_id integer NOT NULL,
    leave_type text NOT NULL,
    is_half_day boolean DEFAULT false NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'Pending'::text NOT NULL,
    reviewed_at timestamp without time zone,
    reviewer_note text,
    forwarded_to_staff_id integer,
    approver_ids text DEFAULT '[]'::text NOT NULL,
    supporting_document text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.leave_requests OWNER TO postgres;

--
-- Name: leave_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leave_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leave_requests_id_seq OWNER TO postgres;

--
-- Name: leave_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leave_requests_id_seq OWNED BY public.leave_requests.id;


--
-- Name: leave_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_types (
    id integer NOT NULL,
    name text NOT NULL,
    max_days integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    payable boolean DEFAULT true NOT NULL,
    payment_rate numeric(12,2) DEFAULT '100'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.leave_types OWNER TO postgres;

--
-- Name: leave_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leave_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leave_types_id_seq OWNER TO postgres;

--
-- Name: leave_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leave_types_id_seq OWNED BY public.leave_types.id;


--
-- Name: medicines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.medicines (
    id integer NOT NULL,
    sku text NOT NULL,
    name text NOT NULL,
    generic_name text NOT NULL,
    form text NOT NULL,
    strength text NOT NULL,
    stock integer NOT NULL,
    reorder_level integer NOT NULL,
    price numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    batch_no text NOT NULL,
    expiry_date timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.medicines OWNER TO postgres;

--
-- Name: medicines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.medicines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.medicines_id_seq OWNER TO postgres;

--
-- Name: medicines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.medicines_id_seq OWNED BY public.medicines.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    sender_id text NOT NULL,
    receiver_id text,
    channel_type text DEFAULT 'organization'::text NOT NULL,
    department_id integer,
    content text NOT NULL,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    link text,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    mrn text NOT NULL,
    name text NOT NULL,
    age integer NOT NULL,
    gender text NOT NULL,
    phone text NOT NULL,
    address text NOT NULL,
    blood_group text,
    allergies text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.patients OWNER TO postgres;

--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patients_id_seq OWNER TO postgres;

--
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- Name: payslips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payslips (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    month text NOT NULL,
    basic_salary numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    hra numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    conveyance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    medical numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    special numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    epf numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    esi numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    professional_tax numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    other_deductions numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    late_attendance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    leave_days_taken numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    leave_deduction numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    net_salary numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    hr_notes text,
    coo_notes text,
    accounts_notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payslips OWNER TO postgres;

--
-- Name: payslips_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payslips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payslips_id_seq OWNER TO postgres;

--
-- Name: payslips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payslips_id_seq OWNED BY public.payslips.id;


--
-- Name: po_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.po_items (
    id integer NOT NULL,
    po_id integer NOT NULL,
    item_name text NOT NULL,
    category text,
    unit text,
    ordered_qty numeric(12,2) NOT NULL,
    unit_rate numeric(12,2) NOT NULL,
    gst_percent numeric(5,2) DEFAULT 0 NOT NULL,
    line_value numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.po_items OWNER TO postgres;

--
-- Name: po_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.po_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.po_items_id_seq OWNER TO postgres;

--
-- Name: po_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.po_items_id_seq OWNED BY public.po_items.id;


--
-- Name: po_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.po_payments (
    id integer NOT NULL,
    po_id integer NOT NULL,
    payment_date date NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_mode public.payment_mode NOT NULL,
    reference_no text,
    remarks text,
    created_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.po_payments OWNER TO postgres;

--
-- Name: po_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.po_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.po_payments_id_seq OWNER TO postgres;

--
-- Name: po_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.po_payments_id_seq OWNED BY public.po_payments.id;


--
-- Name: prescription_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prescription_lines (
    id integer NOT NULL,
    prescription_id integer NOT NULL,
    medicine_id integer NOT NULL,
    dosage text NOT NULL,
    duration text NOT NULL,
    quantity integer NOT NULL,
    instructions text NOT NULL
);


ALTER TABLE public.prescription_lines OWNER TO postgres;

--
-- Name: prescription_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.prescription_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prescription_lines_id_seq OWNER TO postgres;

--
-- Name: prescription_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.prescription_lines_id_seq OWNED BY public.prescription_lines.id;


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prescriptions (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    encounter_id integer,
    status text DEFAULT 'Open'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.prescriptions OWNER TO postgres;

--
-- Name: prescriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.prescriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prescriptions_id_seq OWNER TO postgres;

--
-- Name: prescriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.prescriptions_id_seq OWNED BY public.prescriptions.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    po_no text NOT NULL,
    po_date date NOT NULL,
    vendor_id integer NOT NULL,
    po_status public.po_status DEFAULT 'open'::public.po_status NOT NULL,
    payment_status public.po_payment_status DEFAULT 'unpaid'::public.po_payment_status NOT NULL,
    total_value numeric(12,2) DEFAULT 0 NOT NULL,
    remarks text,
    created_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.purchase_orders OWNER TO postgres;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchase_orders_id_seq OWNER TO postgres;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: rosters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rosters (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    department_id integer NOT NULL,
    shift_id integer NOT NULL,
    start_date text NOT NULL,
    end_date text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rosters OWNER TO postgres;

--
-- Name: rosters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rosters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rosters_id_seq OWNER TO postgres;

--
-- Name: rosters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rosters_id_seq OWNED BY public.rosters.id;


--
-- Name: service_catalog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_catalog (
    id integer NOT NULL,
    department text NOT NULL,
    service_name text NOT NULL,
    default_rate numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    default_show boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.service_catalog OWNER TO postgres;

--
-- Name: service_catalog_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.service_catalog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.service_catalog_id_seq OWNER TO postgres;

--
-- Name: service_catalog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.service_catalog_id_seq OWNED BY public.service_catalog.id;


--
-- Name: service_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_categories (
    id integer NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    is_variable_amount boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.service_categories OWNER TO postgres;

--
-- Name: service_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.service_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.service_categories_id_seq OWNER TO postgres;

--
-- Name: service_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.service_categories_id_seq OWNED BY public.service_categories.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    id text NOT NULL,
    "expiresAt" timestamp without time zone NOT NULL,
    token text NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL,
    "impersonatedBy" text,
    "createdAt" timestamp without time zone NOT NULL,
    "updatedAt" timestamp without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- Name: shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shifts (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    is_off_day boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shifts OWNER TO postgres;

--
-- Name: shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shifts_id_seq OWNER TO postgres;

--
-- Name: shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shifts_id_seq OWNED BY public.shifts.id;


--
-- Name: staff; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff (
    staff_id integer NOT NULL,
    employee_code text NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    salary numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    aadhar text DEFAULT ''::text NOT NULL,
    pan text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    user_id text,
    is_executive boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staff OWNER TO postgres;

--
-- Name: staff_departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_departments (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    staff_version integer DEFAULT 1 NOT NULL,
    department_id integer NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    changed_by_id text,
    changed_by_name text,
    changed_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staff_departments OWNER TO postgres;

--
-- Name: staff_departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.staff_departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staff_departments_id_seq OWNER TO postgres;

--
-- Name: staff_departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staff_departments_id_seq OWNED BY public.staff_departments.id;


--
-- Name: staff_hr_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_hr_profiles (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    staff_version integer DEFAULT 1 NOT NULL,
    date_of_birth text,
    gender text,
    marital_status text,
    blood_group text,
    father_name text,
    mother_name text,
    spouse_name text,
    emergency_contact_name text,
    emergency_contact_phone text,
    current_address text,
    permanent_address text,
    education_history text DEFAULT '[]'::text NOT NULL,
    professional_history text DEFAULT '[]'::text NOT NULL,
    uan text,
    epf_number text,
    esi_number text,
    date_of_joining text,
    last_working_date text,
    religion text,
    nominees text DEFAULT '[]'::text NOT NULL,
    mnc_registration_no text,
    mnc_validity_upto text,
    mmc_registration_no text,
    mmc_validity_upto text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staff_hr_profiles OWNER TO postgres;

--
-- Name: staff_hr_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.staff_hr_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staff_hr_profiles_id_seq OWNER TO postgres;

--
-- Name: staff_hr_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staff_hr_profiles_id_seq OWNED BY public.staff_hr_profiles.id;


--
-- Name: staff_salaries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_salaries (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    staff_version integer DEFAULT 1 NOT NULL,
    basic_salary numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    hra numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    conveyance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    medical numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    special numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    epf numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    esi numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    professional_tax numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    other_deductions numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    late_attendance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    bank_name text,
    account_number text,
    ifsc_code text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staff_salaries OWNER TO postgres;

--
-- Name: staff_salaries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.staff_salaries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staff_salaries_id_seq OWNER TO postgres;

--
-- Name: staff_salaries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staff_salaries_id_seq OWNED BY public.staff_salaries.id;


--
-- Name: staff_supervisors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_supervisors (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    staff_version integer DEFAULT 1 NOT NULL,
    supervisor1_id integer,
    supervisor2_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staff_supervisors OWNER TO postgres;

--
-- Name: staff_supervisors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.staff_supervisors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staff_supervisors_id_seq OWNER TO postgres;

--
-- Name: staff_supervisors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staff_supervisors_id_seq OWNED BY public.staff_supervisors.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    date text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    type text NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    payment_method text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    image text,
    role text DEFAULT 'user'::text,
    banned boolean DEFAULT false,
    "banReason" text,
    "banExpires" timestamp without time zone,
    "createdAt" timestamp without time zone NOT NULL,
    "updatedAt" timestamp without time zone NOT NULL,
    "mustChangePassword" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- Name: vendors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendors (
    id integer NOT NULL,
    name text NOT NULL,
    gst_number text,
    contact_person text,
    phone text,
    address text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vendors OWNER TO postgres;

--
-- Name: vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vendors_id_seq OWNER TO postgres;

--
-- Name: vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vendors_id_seq OWNED BY public.vendors.id;


--
-- Name: verification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp without time zone NOT NULL,
    "createdAt" timestamp without time zone,
    "updatedAt" timestamp without time zone
);


ALTER TABLE public.verification OWNER TO postgres;

--
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: banks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banks ALTER COLUMN id SET DEFAULT nextval('public.banks_id_seq'::regclass);


--
-- Name: biometric_mappings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biometric_mappings ALTER COLUMN id SET DEFAULT nextval('public.biometric_mappings_id_seq'::regclass);


--
-- Name: consultant_rates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultant_rates ALTER COLUMN id SET DEFAULT nextval('public.consultant_rates_id_seq'::regclass);


--
-- Name: daily_additional_income id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_additional_income ALTER COLUMN id SET DEFAULT nextval('public.daily_additional_income_id_seq'::regclass);


--
-- Name: daily_closing_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_closing_reports ALTER COLUMN id SET DEFAULT nextval('public.daily_closing_reports_id_seq'::regclass);


--
-- Name: daily_discounts_returns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_discounts_returns ALTER COLUMN id SET DEFAULT nextval('public.daily_discounts_returns_id_seq'::regclass);


--
-- Name: daily_expenditures id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_expenditures ALTER COLUMN id SET DEFAULT nextval('public.daily_expenditures_id_seq'::regclass);


--
-- Name: daily_ipd_admissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_ipd_admissions ALTER COLUMN id SET DEFAULT nextval('public.daily_ipd_admissions_id_seq'::regclass);


--
-- Name: daily_ipd_discharges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_ipd_discharges ALTER COLUMN id SET DEFAULT nextval('public.daily_ipd_discharges_id_seq'::regclass);


--
-- Name: daily_payment_channels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_payment_channels ALTER COLUMN id SET DEFAULT nextval('public.daily_payment_channels_id_seq'::regclass);


--
-- Name: daily_pharmacy_income id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_pharmacy_income ALTER COLUMN id SET DEFAULT nextval('public.daily_pharmacy_income_id_seq'::regclass);


--
-- Name: daily_service_lines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_service_lines ALTER COLUMN id SET DEFAULT nextval('public.daily_service_lines_id_seq'::regclass);


--
-- Name: daily_staff_advances id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_staff_advances ALTER COLUMN id SET DEFAULT nextval('public.daily_staff_advances_id_seq'::regclass);


--
-- Name: department_leaders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_leaders ALTER COLUMN id SET DEFAULT nextval('public.department_leaders_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: designations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.designations ALTER COLUMN id SET DEFAULT nextval('public.designations_id_seq'::regclass);


--
-- Name: encounters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encounters ALTER COLUMN id SET DEFAULT nextval('public.encounters_id_seq'::regclass);


--
-- Name: expense_catalog id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_catalog ALTER COLUMN id SET DEFAULT nextval('public.expense_catalog_id_seq'::regclass);


--
-- Name: expense_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories ALTER COLUMN id SET DEFAULT nextval('public.expense_categories_id_seq'::regclass);


--
-- Name: grn_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grn_items ALTER COLUMN id SET DEFAULT nextval('public.grn_items_id_seq'::regclass);


--
-- Name: grns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grns ALTER COLUMN id SET DEFAULT nextval('public.grns_id_seq'::regclass);


--
-- Name: immunization_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.immunization_records ALTER COLUMN id SET DEFAULT nextval('public.immunization_records_id_seq'::regclass);


--
-- Name: immunization_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.immunization_schedules ALTER COLUMN id SET DEFAULT nextval('public.immunization_schedules_id_seq'::regclass);


--
-- Name: inventory_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_items_id_seq'::regclass);


--
-- Name: item_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_types ALTER COLUMN id SET DEFAULT nextval('public.item_types_id_seq'::regclass);


--
-- Name: items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items ALTER COLUMN id SET DEFAULT nextval('public.items_id_seq'::regclass);


--
-- Name: leave_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests ALTER COLUMN id SET DEFAULT nextval('public.leave_requests_id_seq'::regclass);


--
-- Name: leave_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_types ALTER COLUMN id SET DEFAULT nextval('public.leave_types_id_seq'::regclass);


--
-- Name: medicines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medicines ALTER COLUMN id SET DEFAULT nextval('public.medicines_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- Name: payslips id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payslips ALTER COLUMN id SET DEFAULT nextval('public.payslips_id_seq'::regclass);


--
-- Name: po_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_items ALTER COLUMN id SET DEFAULT nextval('public.po_items_id_seq'::regclass);


--
-- Name: po_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_payments ALTER COLUMN id SET DEFAULT nextval('public.po_payments_id_seq'::regclass);


--
-- Name: prescription_lines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescription_lines ALTER COLUMN id SET DEFAULT nextval('public.prescription_lines_id_seq'::regclass);


--
-- Name: prescriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions ALTER COLUMN id SET DEFAULT nextval('public.prescriptions_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: rosters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rosters ALTER COLUMN id SET DEFAULT nextval('public.rosters_id_seq'::regclass);


--
-- Name: service_catalog id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_catalog ALTER COLUMN id SET DEFAULT nextval('public.service_catalog_id_seq'::regclass);


--
-- Name: service_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_categories ALTER COLUMN id SET DEFAULT nextval('public.service_categories_id_seq'::regclass);


--
-- Name: shifts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts ALTER COLUMN id SET DEFAULT nextval('public.shifts_id_seq'::regclass);


--
-- Name: staff_departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_departments ALTER COLUMN id SET DEFAULT nextval('public.staff_departments_id_seq'::regclass);


--
-- Name: staff_hr_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_hr_profiles ALTER COLUMN id SET DEFAULT nextval('public.staff_hr_profiles_id_seq'::regclass);


--
-- Name: staff_salaries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_salaries ALTER COLUMN id SET DEFAULT nextval('public.staff_salaries_id_seq'::regclass);


--
-- Name: staff_supervisors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_supervisors ALTER COLUMN id SET DEFAULT nextval('public.staff_supervisors_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: vendors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors ALTER COLUMN id SET DEFAULT nextval('public.vendors_id_seq'::regclass);


--
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account (id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", scope, password, "createdAt", "updatedAt") FROM stdin;
9yYuJD540MupdtzK6jwrxyAppagAfaIN	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	credential	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	\N	\N	\N	\N	\N	\N	5950a2f44853600a501a1587a93b952f:b2530ca1875473afd9e23d50c1e91657f4e8553dad6d0dc3e9f2fdaa98cb22452d47ffda11e0a8acd1802562de6b44a6bc6b1d3f84b0bcf1ecc841c81ce6eae2	2026-07-14 11:10:25.23	2026-07-14 11:10:25.23
IJCwRecxbMkuDRkMRCPg7XcFQAAYnVlw	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	credential	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	\N	\N	\N	\N	\N	\N	bb93fc8aa6c6ec7338b96c77aeefd630:d6cf2a9b12e1a39a48a13651f784be48a749015d5dfed59a603f5ac421146b730068c87e50910ac49a7a884656aa4c81af41036d2382326cbe7e807757e95aba	2026-07-14 11:46:50.254	2026-07-14 11:46:50.254
lFoWwwmGrv1GH6LrW9fbI4n8gsDcfnmR	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	credential	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	\N	\N	\N	\N	\N	\N	fe34c987dd44c4ea9bd0095865a794f4:25ef9613564d8194b9384c380c37e0cc9cec7b0fb96a3f2e4182d34eccc1b7f20adb0494193f6e994765eac91a4a40bee98ff00394bf35a780baeedefaed8aea	2026-07-14 11:46:57.294	2026-07-14 11:46:57.294
gD4dLEYu30l7m5CVvCVRhAELGSImuy8H	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	credential	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	\N	\N	\N	\N	\N	\N	baa591f9c92f384ebb5edbc73e306bf1:601367754c2ca1ea129c84693483ba1587cfc8a74d29cf5ca778d2740a9065320ce64561de24698e1cbe13d7bc977ff8aaab2160ac38bfe36a8f54ab011fc234	2026-07-14 11:47:05.279	2026-07-14 11:47:05.279
nLwU5lC0hL8Dgats9cNUn6QysrEib9Az	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	credential	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	\N	\N	\N	\N	\N	\N	05ce2baba03e628ad37b4fe43433de37:99b806f20b8c19bba46e9292b043e454f1df23198de38dd68275c3808e0786ad2e67ef6468b00d84f361dd0b19527ee1357aa8b125ad62b4a57ab31a8cb2951f	2026-07-14 11:47:13.378	2026-07-14 11:47:13.378
HsFKGzxEJ4xopdeO4aiYEQHdNQIK2ztJ	Ka7zRdnBC1l9KZ271rUof2l6QWVrB1Zb	credential	Ka7zRdnBC1l9KZ271rUof2l6QWVrB1Zb	\N	\N	\N	\N	\N	\N	528b7ba086cec5c5913089c7046b9ff9:12f214f4075e0638df80d8b77a98302b944b8b436cf8096109b3466acc247fe53af4a19cb5095da4a0bb159f8aa9bafa2d43224f29efa73291defd97e6ad52b7	2026-07-16 11:57:43.312	2026-07-16 11:57:43.312
mVFzsXJG6UHjd2qhP9wVG6lqhzbHQgbd	1Dv121z8xdadYrlt8gVSvuFytyzP7KGH	credential	1Dv121z8xdadYrlt8gVSvuFytyzP7KGH	\N	\N	\N	\N	\N	\N	8071c78d1bf5fe8c922d9d2bc6ae0830:cb029045ecee64d0b71253a23969a588d7c02806be1362b536f1b4bb6eeb9f32414407a30798836dcca2b710aa96f5b4cafafbe86b597ae7388b30c402aa0402	2026-07-16 11:58:15.622	2026-07-16 11:58:15.622
VOHAaFAAqqPI80Khz9Bv2ijM2P8ZrM7N	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	credential	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	\N	\N	\N	\N	\N	8c7c24ccc9588a675af8cf2ee3ba37aa:7d07198d4e2627186eb97c3516738ca5a4d43810e3eeb405740ad1ef78fb56491a96b837ccd772796258700671e9e9516a965b7cfc6876e20a7f3b64c18d0d7f	2026-07-14 09:14:46.511	2026-07-22 10:41:01.149
jp0l3EphYrJ2b63ZFtxwE00eQFZF6bZN	4jkPcSiE1XLo8XjDPon3LlNzhvgC5cls	credential	4jkPcSiE1XLo8XjDPon3LlNzhvgC5cls	\N	\N	\N	\N	\N	\N	8ce880ae9dd64228d9ee801e4ea4e69f:366e75c376be342164c281d2584938e3c37b4785ee770f05145e17a0246175b9c70bbf95403011a867c494d8ba66deff01dda3cd57f1cae6fab99beb2f776a10	2026-07-23 06:18:24.467	2026-07-23 06:18:24.467
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appointments (id, patient_id, doctor_id, department_id, scheduled_at, reason, status, token, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance (id, staff_id, date, check_in, check_out, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: banks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.banks (id, name, active, created_at, updated_at) FROM stdin;
1	State Bank of India	t	2026-07-14 09:14:46.766358	2026-07-14 09:14:46.766358
2	HDFC Bank	t	2026-07-14 09:14:46.766358	2026-07-14 09:14:46.766358
3	ICICI Bank	t	2026-07-14 09:14:46.766358	2026-07-14 09:14:46.766358
4	Axis Bank	t	2026-07-14 09:14:46.766358	2026-07-14 09:14:46.766358
5	Bank Of India	t	2026-07-14 09:14:46.766358	2026-07-14 09:14:46.766358
6	Manipur Rural Bank 	t	2026-07-14 09:14:46.766358	2026-07-14 09:14:46.766358
7	Central Bank of India 	t	2026-07-14 09:14:46.766358	2026-07-14 09:14:46.766358
8	Punjab National Bank 	t	2026-07-14 09:14:46.766358	2026-07-14 09:14:46.766358
\.


--
-- Data for Name: biometric_mappings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.biometric_mappings (id, staff_id, biometric_code, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: consultant_rates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultant_rates (id, doctor_id, base_rate, doctor_share_percent, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: daily_additional_income; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_additional_income (id, report_id, label, amount) FROM stdin;
\.


--
-- Data for Name: daily_closing_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_closing_reports (id, report_date, created_by, opening_balance, bank_deposit, fund_handover_sir, fund_handover_madam, total_income, total_expenditure, closing_balance, cash_receipt_sir, cash_receipt_mam, cash_receipt_acon, cash_receipts_total, cash_receipts, bank_receipts_total, bank_receipt_sir, bank_receipt_sir_bank, bank_deposits, status, created_at, updated_at, cash_denominations, reconciliation_tolerance, soiled_notes) FROM stdin;
7	2026-07-21	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	18627.00	0.00	0.00	0.00	140390.00	126430.00	17687.00	0.00	8000.00	32000.00	125490.00	85490.00	54900.00	0.00	\N	[]	submitted	2026-07-21 08:32:46.282201	2026-07-21 12:52:21.132	{"10": 10, "20": 11, "50": 9, "100": 40, "200": 20, "500": 18}	0.00	990
11	2026-07-25	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	15215.00	0.00	0.00	0.00	340244.00	203220.00	-8530.00	0.00	0.00	0.00	179475.00	179475.00	160769.00	0.00	\N	[]	draft	2026-07-25 09:40:16.362409	2026-07-25 13:32:36.901	{"10": 14, "20": 31, "50": 10, "100": 3, "200": 1, "500": 9}	0.00	990
10	2026-07-24	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	2147.00	0.00	0.00	100000.00	761007.00	235300.00	15215.00	0.00	0.00	0.00	348368.00	348368.00	412639.00	0.00	\N	[]	draft	2026-07-25 06:31:35.468416	2026-07-25 07:42:21.579	{"5": 38, "10": 8, "20": 18, "50": 5, "100": 6, "200": 4, "500": 26}	65.00	\N
9	2026-07-23	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	6255.00	250000.00	0.00	0.00	260253.00	165785.00	2147.00	250000.00	0.00	25000.00	411677.00	136677.00	123576.00	0.00	\N	[{"bankName":"BOI-100","amount":200000},{"bankName":"Sir(HDFC-15820)","amount":50000}]	submitted	2026-07-23 09:36:54.268438	2026-07-25 06:27:05.557	{"10": 9, "20": 2, "50": 2, "100": 2, "200": 4, "500": 2}	100.00	990
8	2026-07-22	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	17687.00	0.00	0.00	0.00	252830.00	195480.00	6255.00	0.00	0.00	32000.00	184048.00	152048.00	99682.00	0.00	\N	[]	submitted	2026-07-22 06:01:32.947419	2026-07-22 12:58:44.517	{"10": 30, "20": 17, "100": 3, "200": 2, "500": 10}	0.00	990
5	2026-07-19	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	23747.00	0.00	0.00	0.00	276507.00	155920.00	31459.00	0.00	0.00	0.00	163632.00	163632.00	112875.00	0.00	\N	[]	submitted	2026-07-20 12:04:27.855119	2026-07-20 12:30:37.258	{"20": 20, "50": 1, "200": 5, "500": 60}	9.00	990
3	2026-07-18	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	1122.00	6000.00	0.00	0.00	520692.00	257840.00	23747.00	46000.00	0.00	0.00	286465.00	240465.00	280227.00	0.00	\N	[{"bankName":"Humakind (ICICI)","amount":6000}]	submitted	2026-07-18 10:37:39.009433	2026-07-20 11:21:35.867	{}	0.00	\N
2	2026-07-17	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	10003.00	0.00	0.00	50000.00	514445.00	200100.00	1122.00	0.00	0.00	68000.00	241219.00	173219.00	341226.00	0.00	\N	[]	submitted	2026-07-17 10:02:45.968485	2026-07-18 10:32:10.22	\N	0.00	\N
1	2026-07-16	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	7242.00	0.00	0.00	30000.00	371446.00	238290.00	10003.00	0.00	21500.00	19000.00	271051.00	230551.00	140895.00	0.00	\N	[]	submitted	2026-07-16 07:00:34.92745	2026-07-17 09:24:12.448	\N	0.00	\N
6	2026-07-20	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	31459.00	0.00	0.00	0.00	189931.00	139510.00	18627.00	0.00	0.00	0.00	126678.00	126678.00	63253.00	0.00	\N	[]	submitted	2026-07-20 12:32:47.602027	2026-07-20 12:55:41.472	{"10": 7, "20": 5, "50": 7, "100": 3, "200": 4, "500": 34}	10.00	910
\.


--
-- Data for Name: daily_discounts_returns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_discounts_returns (id, report_id, label, amount) FROM stdin;
181	6	2 OLD case@20% Agny CARD	180.00
182	6	1 OLD CASE @50%HEALTH card	225.00
183	6	1 TVS Gynae@10%Agny Card	70.00
184	6	TVS obs@10% Privilege Card	70.00
185	6	1 USG LOWER ABDOMEN @ 50% Health Card	350.00
11	1	2 OLD CASE @20% AGNY CARD	180.00
12	1	1 TVS Obs @10% Privilege Card	70.00
13	1	2 USG FWB @10% Privilege Card	240.00
14	1	1 TVS Gynae@10% Privilege Card	70.00
15	1	1 Iron Infusion Charge @10% Privilege Card	60.00
127	3	1 TVS Obs @10%@Privilege Card	70.00
128	3		0.00
645	9	1 OLD CASE@ free 	450.00
646	9	1 OLD CASE@10% Agny Card	90.00
647	9	1TVS Obs@10% Privilege Card	70.00
648	9	2 USG FWB@10% Privilege Card	240.00
140	5	USG FWB@10% Privilege CARD	120.00
649	9	1 D/C@10% Privilege Card	900.00
650	9	2 Iron Infusion Charge@10% Privilege Card	120.00
651	9	1 Dressing Charge @10% Privilege Card	30.00
772	10	1 Iron Infusion charge @10% Privilege Card (Night)	60.00
773	10	1 TVS Obs @10% Privilege Card(Night)	70.00
774	10	1 Old Case @50% Health Card	225.00
775	10	2 USG FWB @10%Privilege Card	240.00
107	2	1 OLD CASE @50% Health Card	225.00
108	2	1 USG FWB @10% Privilege Card	120.00
109	2	1 Dressing Charge @10% Privilege Card	30.00
110	2	1 TVS Obs Twins @ 10% Privilege Card	100.00
286	8	1Old Case @ Free	450.00
287	8	1 Old Case @20% Agny Card	90.00
\.


--
-- Data for Name: daily_expenditures; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_expenditures (id, report_id, category, details, amount, narration) FROM stdin;
1638	3	ACON	Labour Refreshment(new Hostel)	160.00	\N
1639	3	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	1510.00	\N
1640	3	CANTEEN_EXPENSES	Commercial GAS for Canteen	3450.00	\N
1641	3	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
1642	3	HOME	Plastic Tools & Wiper for Home	980.00	\N
1643	3	STORE_MARKETING	Detergent for ACME	2000.00	\N
1644	3	REPAIRING_&_SERVICING	Carry tyre Repairing	100.00	\N
1645	3	REPAIRING_&_SERVICING	IVF A/C Servicing with gas refilled	5000.00	\N
1646	3	STAFF	STAFF SALARY	6750.00	\N
1647	3	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
1648	3	ACON	RENT FEE	50000.00	\N
1649	3	PROGRAM_&_FUNCTION	Training for Effective Communication  at MCCHRC	6750.00	\N
1650	3	ACON	ACON CONSTRUCTION(Stone chip big 1 Load)	29000.00	\N
1651	3	ACON	ACON CONSTRUCTION(Stone Chip small 2 Load)	17000.00	\N
1652	3	ACON	ACON CONSTRUCTION(Ply Board)3PCS	4200.00	\N
1653	3	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	2370.00	\N
1654	3	CANTEEN_EXPENSES	CANTEEN(FISH)	720.00	\N
1655	3	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DMD(Night Extra Charges)	400.00	\N
1656	3	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	12000.00	\N
1657	3	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
1658	3	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
1659	3	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
1660	3	HOSPITAL_EXPENSES	Flower for Front DEPT.	50.00	\N
1661	3	REFRESHMENT	Home	200.00	\N
1886	7	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
1887	7	DAILY_COLLECTION	SANATHOI (20000*2)	20000.00	\N
1888	7	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
1889	7	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
1890	7	STORE_MARKETING	MEDICINE & CONSUMABLES ITEMS	15000.00	\N
1891	7	PETROL	Van	1000.00	\N
1766	6	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	12000.00	\N
1767	6	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
1768	6	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
1769	6	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
1770	6	DAILY_COLLECTION	ASWF(20000*2)	20000.00	\N
1771	6	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
1772	6	STORE_MARKETING	MAHABHIR DISTRIBUTOR	10800.00	Mahavir Distributor(Endogolix 200mg )bill date-30/06/2026\n
1773	6	STORE_MARKETING	International Departmental (Dipigen)bill date-8/07/2026	4570.00	\N
1774	6	REPAIRING_&_SERVICING	Tyre gae refill for Carry	20.00	\N
1775	6	COURIER_&_POSTAL	Flight charges for Amagen & Medall	6100.00	\N
1776	6	MEDICAL_CONSULTANT_CHARGES	ET Surgeon charges for Dr.Dijen	9000.00	\N
1777	6	ACON	WATER TANKER	800.00	Water for ACON New Hostel Construction
1778	6	ACON	Hostel Snacks	300.00	\N
1779	6	CANTEEN_EXPENSES	CANTEEN MARKETING-(DRY ITEMS)	120.00	Biscuit & Egg for Canteen Marketing\n
1780	6	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	100.00	Bakery items\n
1781	6	CANTEEN_EXPENSES	CANTEEN(FISH)	500.00	\N
3346	11	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	12000.00	\N
3347	11	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
3348	11	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
3349	11	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
3350	11	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
3351	11	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DDS	3700.00	Anaethesia Charges for Dr. DDS(LSCS-Twins )\n
3352	11	MISC	Lab Charges Dental	200.00	\N
3353	11	MISC	Patient Refund  	120.00	\N
3354	11	WATER	WATER TANKER	1000.00	Water Tanker for Girls Hostel\n
3355	11	MISC	Puinabati Interest(for the month of June'26)	36000.00	\N
1741	5	STAFF	STAFF SALARY	3340.00	\N
1742	5	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
1743	5	DAILY_COLLECTION	ASWF(20000*2)	20000.00	\N
1744	5	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
1745	5	MEDICAL_CONSULTANT_CHARGES	PATHOLOGY(SALARY)	15000.00	\N
1746	5	ACON	ACON CONSTRUCTION	700.00	RAINCOAT
1747	5	ACON	ACON CONSTRUCTION	30000.00	PLYBOARD
508	1	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	250.00	\N
509	1	URUP	SALARY	19000.00	\N
510	1	REPAIRING_&_SERVICING	VEHICLE	500.00	\N
511	1	WATER	WATER TANKER	1000.00	\N
512	1	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
513	1	ACON	PETROL	100.00	\N
514	1	URUP	URUP EXPENSES	1000.00	\N
515	1	REFRESHMENT	OT	220.00	\N
516	1	REFRESHMENT	IVF	140.00	\N
517	1	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	1880.00	\N
518	1	MARKETING	CANTEEN(FISH)	600.00	\N
519	1	POSTAL_&_COURIER_CHARGES	MEDICINE ITEMS (HUMANKIND)	21400.00	\N
520	1	CANTEEN_EXPENSES	CANTEEN MARKETING-(DRY ITEMS)	15300.00	\N
521	1	DAILY_COLLECTION	SANATHOI (20000*2)	60000.00	\N
522	1	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
523	1	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	12000.00	\N
524	1	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
525	1	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
526	1	MARKETING	COFFEE SHOP (DISPO)	100.00	\N
527	1	INVESTMENT	LORENDRO MARUP	5000.00	\N
528	1	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DMD	3900.00	\N
529	1	MEDICAL_CONSULTANT_CHARGES	USG WHOLE ABDOMEN CHARGES FOR DR.SANJIT	840.00	\N
530	1	MEDICAL_CONSULTANT_CHARGES	USG WHOLE ABDOMEN CHARGES FOR DR.SANJIT	840.00	\N
531	1	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DDS	3700.00	\N
532	1	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DMD	3700.00	\N
533	1	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR TOMORROW	3700.00	\N
534	1	STAFF	STAFF SALARY	7920.00	\N
1748	5	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	80.00	\N
1749	5	ACON	ACON CONSTRUCTION	500.00	MATRESS FOR Labour
1750	5	CANTEEN_EXPENSES	CANTEEN MARKETING-(DRY ITEMS)	10250.00	for Chicken(41*250)
1751	5	ACON	CHICKEN FOR HOSTEL	850.00	\N
1752	5	RECHARGE	FOR DELUXE -7	500.00	\N
1753	5	ACON	ACON CONSTRUCTION	50.00	LABOUR REFRESHMENT
1754	5	STORE_MARKETING	AMETOMBI	7450.00	\N
1755	5	ACME_ASSET_EXPENSES	ASSET EXPENSES	17000.00	bed for Security Barrack
1756	5	MEDICAL_CONSULTANT_CHARGES	NVD Assist. charges for Dr.Phalguni 	10000.00	\N
1879	7	ACON	ACON EXPENSES	8000.00	ACON Ads run Booster (Neopath)Payment by Ma'am-UPI\n
1134	2	MEDICAL_CONSULTANT_CHARGES	NIGHT EXPENSES-ANAETHESIA CHARGE FOR DR.DMD(LSCS)	3900.00	\N
1135	2	WATER	NIGHT EXPENSES-WATER TANKER(ACME)	1000.00	\N
1136	2	RECHARGE	NIGHT EXPENSES-MOBILE RECHARGE FOR FRONT DEPT.	200.00	\N
1137	2	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	12000.00	\N
1138	2	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
1139	2	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
1140	2	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DMD(LSCS)	3900.00	\N
1141	2	MEDICAL_CONSULTANT_CHARGES	USG WHOLE ABDOMEN CHARGES FOR DR.SANJIT	840.00	\N
1142	2	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
1143	2	DONATION	DONATION(ALL MANIPUR MIX BOXING ASSOCIATION)	500.00	\N
1144	2	REFRESHMENT	OT	200.00	\N
1145	2	REFRESHMENT	IVF	30.00	\N
1146	2	HOME	MILK 	200.00	\N
1147	2	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING(BAKERY ITEMS)	250.00	\N
1148	2	CANTEEN_EXPENSES	CANTEEN MARKETING-EGG	520.00	\N
1149	2	PROGRAM_&_FUNCTION	ACME(TRAINEE PROGRAM FOR Prof.Jibon)	3000.00	\N
1150	2	CANTEEN_EXPENSES	CANTEEN(FISH)	480.00	\N
1151	2	HOSPITAL_EXPENSES	PRINTING & STATIONERY ITEMS(INCHTAPE_)	240.00	\N
1152	2	HOSPITAL_EXPENSES	PRINTING & STATIONERY ITEMS(FLEX GUM)	100.00	\N
1153	2	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
1154	2	CANTEEN_EXPENSES	CANTEEN DISPO	1720.00	\N
1155	2	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	4500.00	\N
1156	2	STORE_MARKETING	MEDICINE & CONSUMABLES ITEMS(EXCESS)	2540.00	\N
1157	2	ACON	ACON CONSTRUCTION (WOOD)	3800.00	\N
1158	2	ACON	ACON CONSTRUCTION (PIN)	1000.00	\N
1159	2	ACON	ACON CONSTRUCTION (PLYBOARD)	40000.00	\N
1160	2	ACON	ACON CONSTRUCTION (WOOD CUTTER)	1000.00	\N
1161	2	PROGRAM_&_FUNCTION	ACME (FRONT PHONE PURCHASE)	1300.00	\N
1162	2	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	1680.00	\N
1163	2	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
1880	7	ACON	WATER TANKER	1000.00	\N
1881	7	REFRESHMENT	IVF	110.00	\N
1882	7	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	3140.00	Canteen  Marketing for Vegetables items(Bidyachandra)\n
1883	7	BAMON_KAMPU_CONSTRUCTION	Refreshment for BamonKampu(Dt.12-6-26 to 21-07-2026)	5380.00	\N
1884	7	PROGRAM_&_FUNCTION	Flex for THE WORLD IVF DAY Celebration	600.00	\N
1885	7	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	12000.00	\N
3356	11	STORE_MARKETING	Store Marketing (Mom plus Syrup)	3380.00	\N
3198	10	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	12000.00	\N
3199	10	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
3200	10	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
3201	10	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
3202	10	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
3203	10	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
3204	10	ACON	ACON CONSTRUCTION	350.00	Labour Refreshment for ACON Hostel\n
3205	10	REFRESHMENT	OT	320.00	\N
3206	10	MEDICAL_CONSULTANT_CHARGES	1 Consultant visit for Dr.PK	700.00	\N
3357	11	MEDICAL_CONSULTANT_CHARGES	Consultant visit for Dr.PK	1330.00	\N
3358	11	MEDICAL_CONSULTANT_CHARGES	Anaethesia Charges for Tommorrow(3-LSCS )& Myst. Myomectomy	15600.00	\N
3359	11	MEDICAL_CONSULTANT_CHARGES	Anaethesia Charges for Tommorrow 1OPU	1500.00	\N
3360	11	ACON	ACON CONSTRUCTION	430.00	Labour Refreshment for ACON Hostel\n
3361	11	ACON	ACON CONSTRUCTION	35250.00	Wood for Boy's Hostel (Full Payment)\n
3362	11	ACON	ACON CONSTRUCTION	10000.00	Tomthin Electrical & Hardware(Electrical Material )for Girl's Hostel(2 partly payment)\n
3363	11	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	4000.00	\N
3364	11	PROGRAM_&_FUNCTION	Coconut Water for The World IVF Day Celebration	100.00	\N
3365	11	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	3410.00	\N
3207	10	MEDICAL_CONSULTANT_CHARGES	USG WHOLE ABDOMEN CHARGES FOR DR.SANJIT	840.00	\N
3208	10	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DDS	7400.00	2 Anaethesia Charges for Dr. DDS(3700*2)\n
3209	10	PRINTING_AND_STATIONARY	Photo Frame	6000.00	\N
3210	10	CANTEEN_EXPENSES	CANTEEN MARKETING-(DRY ITEMS)	2000.00	\N
3211	10	ACON	ACON CONSTRUCTION	35000.00	Ply Board for New hostel \n
3212	10	ACON	ACON CONSTRUCTION	29000.00	Stone Big 1 Load Boy's Hostel\n
3213	10	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING 	250.00	Coffee shop Marketing(Bakery Items)\n
3214	10	VENDOR	MARTMedicine Mart(Sporlac EVA)	4490.00	\N
3215	10	VENDOR	Yam Yam Medicos	6340.00	\N
3216	10	VENDOR	Rivolta Medicos(Gtox-MV)	10000.00	\N
3217	10	POSTAL_&_COURIER_CHARGES	HUMANKIND Dalcon Courier Charge(Dalcon to Guwahati)	2790.00	\N
3218	10	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	2120.00	Canteen Marketing(Vegetable Items)Bidyachandra\n
3219	10	ACON	ACON CONSTRUCTION	500.00	Nail(5Kg) for New Hostel\n
2356	8	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DDS	3900.00	LSCS(Night)
2357	8	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DMD	3900.00	LSCS(Night)
2358	8	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DMD	3700.00	LSCS(Morning)
2359	8	ACON	ACON CONSTRUCTION	30000.00	Wood Partly Payment
2360	8	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	2340.00	\N
2361	8	ACON	Fish for Hostel Mess(2.3 Kg)	550.00	\N
2362	8	CANTEEN_EXPENSES	CANTEEN MARKETING-(DRY ITEMS)	2400.00	Rice 1 Bag,Egg 2Plate
2363	8	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
2364	8	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
2365	8	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
2366	8	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	12000.00	\N
2367	8	PROGRAM_&_FUNCTION	Basket,Polythene,Moong dal,kwa,Banana Leaf for THE WORLD IVF DAY Celebration	3130.00	\N
2368	8	STORE_MARKETING	SB Agency (Unwanted Kit)	2360.00	\N
2369	8	STORE_MARKETING	Store marketing Excess Payment	2270.00	\N
2370	8	PROGRAM_&_FUNCTION	Gift Items for THE WORLD IVF DAY Celebration	13800.00	\N
2371	8	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	2200.00	\N
2372	8	STORE_MARKETING	MEDICINE & CONSUMABLES ITEMS	1200.00	Mop
2373	8	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DMD	3700.00	LSCS
2374	8	MEDICAL_CONSULTANT_CHARGES	Surgeon Charges for Dr.PK	12000.00	LSCS(Night)
2375	8	REFRESHMENT	OT	230.00	\N
2376	8	ACON	ACON CONSTRUCTION	600.00	Labour Refreshment(New Hostel)\n
2377	8	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
2378	8	STORE_MARKETING		0.00	\N
2847	9	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	12000.00	\N
2848	9	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
2849	9	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
2850	9	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
2851	9	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
2852	9	STAFF	Night Extra Salary for Sangita (Lab)	270.00	\N
2853	9	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
2854	9	ACON	Water level Controller set for ACON girl's Hostel	5500.00	\N
2855	9	IVF_EXPENSES	Semen donor for IUI-B	1500.00	\N
2856	9	STORE_MARKETING	GAS (Liquid Nitrogen)	5200.00	\N
2857	9	CANTEEN_EXPENSES	CANTEEN MARKETING-(DRY ITEMS)	17745.00	\N
2858	9	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	3790.00	\N
2859	9	ACON	ACON CONSTRUCTION	500.00	Mattress for Labour
2860	9	MEDICAL_CONSULTANT_CHARGES	USG WHOLE ABDOMEN CHARGES FOR DR.SANJIT	840.00	\N
2861	9	ACON	ACON CONSTRUCTION	440.00	Labour Refreshment
2862	9	PETROL	VAN	1000.00	\N
2863	9	REPAIRING_&_SERVICING	Van side glass	1800.00	\N
\.


--
-- Data for Name: daily_ipd_admissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_ipd_admissions (id, report_id, patient_name, type, amount) FROM stdin;
\.


--
-- Data for Name: daily_ipd_discharges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_ipd_discharges (id, report_id, patient_name, amount) FROM stdin;
\.


--
-- Data for Name: daily_payment_channels; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_payment_channels (id, report_id, bank, channel, source_label, amount) FROM stdin;
755	6	ICICI	UPI	OPD(nIGHT)	1550.00
756	6	ICICI	UPI	OPD	4665.00
757	6	ICICI	UPI	IPD	35490.00
758	6	ICICI	DEBIT CARD	INJECTION	8020.00
759	6	ICICI	UPI	COFFEE SHOP	370.00
148	1	ICICI	UPI	Canteen 	970.00
149	1	ICICI	UPI	Coffee Shop	930.00
150	1	HDFC	UPI	Pharmacy 	38901.00
151	1	HDFC	DEBIT CARD	Pharmacy	2405.00
152	1	ICICI	UPI	Medicine sales	1061.00
153	1	ICICI	UPI	OPD(Night)	9230.00
154	1	ICICI	DEBIT CARD	IVF (Injection)	14240.00
155	1	ICICI	UPI	OPD (Injection)	24198.00
156	1	ICICI	DEBIT CARD	OPD	3050.00
157	1	ICICI	UPI	OPD	40460.00
158	1	ICICI	UPI	IPD	5000.00
159	1	HDFC	UPI	OPD	450.00
160	1	CASH	CASH	TOTAL INCOME	230551.00
760	6	ICICI	DEBIT CARD	CANTEEN	330.00
761	6	HDFC	UPI	PHARM	12828.00
762	6	CASH	CASH		126678.00
898	7	ICICI	UPI	IPD(NIGHT)	12700.00
899	7	ICICI	UPI	OPD	2200.00
900	7	ICICI	UPI	Canteen	420.00
626	3	ICICI	UPI	opd(MORNING)	29698.00
627	3	HDFC	UPI	pharmacy	37517.00
628	3	HDFC	DEBIT CARD	pharmacy	580.00
629	3	ICICI	DEBIT CARD	IPD(EVENING)	105500.00
630	3	ICICI	UPI	IPD(EVENING)	62310.00
631	3	ICICI	UPI	OPD(EVENING)	1300.00
632	3	ICICI	UPI	COFFEE	490.00
633	3	ICICI	UPI	Canteen	750.00
634	3	ICICI	DEBIT CARD	INJECTION	3960.00
635	3	ICICI	UPI	INJECTION	38122.00
636	3	CASH	CASH		240465.00
901	7	ICICI	UPI	IVF Injection	4050.00
902	7	ICICI	UPI	OPD (evening)	1100.00
903	7	ICICI	UPI	OPD INJECTION	18290.00
904	7	ICICI	UPI	COFFEESHOP	660.00
905	7	HDFC	UPI	Pharm	14730.00
906	7	HDFC	DEBIT CARD	Pharm	750.00
907	7	CASH	CASH	Total	85490.00
713	5	ICICI	DEBIT CARD	FRONT(OPD)	5598.00
714	5	ICICI	UPI	FRONT(OPD)	17550.00
715	5	ICICI	UPI	FRONT(IPD)	9700.00
716	5	ICICI	UPI	IMMUNIZATION(NICU)	21849.00
321	2	ICICI	UPI	Night Front IPD-UPI	63080.00
322	2	ICICI	UPI	IPD-UPI	27500.00
323	2	ICICI	UPI	OPD-UPI	47341.00
324	2	ICICI	RTGS	IVF-(NEFT)	150000.00
325	2	ICICI	UPI	COFFEESHOP (UPI)	945.00
326	2	ICICI	UPI	CANTEEN-UPI	820.00
717	5	ICICI	DEBIT CARD	IMMUNIZATION(NICU)	725.00
718	5	ICICI	UPI	INJECTION	33940.00
719	5	ICICI	UPI	COFFEE SHOP	900.00
720	5	ICICI	UPI	CANTEEN	670.00
721	5	HDFC	UPI	PHARM	21126.00
722	5	HDFC	CREDIT CARD	PHARM	817.00
723	5	CASH	CASH	TOTAL	163632.00
327	2	HDFC	UPI	PHARMACY (UPI)	28288.00
328	2	ICICI	UPI	Injection UPI	23252.00
329	2	CASH	CASH		173219.00
1179	8	ICICI	UPI	Front (IPD) Night	20550.00
1180	8	ICICI	UPI	Coffee shop	220.00
1181	8	HDFC	UPI	Pharmacy	28157.00
1182	8	HDFC	CREDIT CARD	Pharmacy	1900.00
1183	8	HDFC	DEBIT CARD	Pharmacy	805.00
1184	8	ICICI	UPI	IPD(morng.)	4570.00
1185	8	ICICI	UPI	OPD(morng.)	15680.00
1186	8	ICICI	CREDIT CARD	OPD(Eveng.)	460.00
1723	9	ICICI	UPI	OPD(mrng)	51210.00
1724	9	ICICI	UPI	IPD(mrng)	2000.00
1725	9	ICICI	DEBIT CARD	OPD	4000.00
1726	9	ICICI	UPI	Canteen	430.00
1187	8	ICICI	UPI	OPD(Eveng.)	8500.00
1188	8	ICICI	UPI	Canteen	780.00
1189	8	ICICI	UPI	OPD Inj	16080.00
1190	8	ICICI	DEBIT CARD	OPD Inj	1980.00
1191	8	CASH	CASH	Total	152048.00
1727	9	ICICI	DEBIT CARD	OPD(eveng)	600.00
1728	9	ICICI	CREDIT CARD	OPD(eveng)	726.00
1729	9	ICICI	UPI	OPD(eveng	10080.00
1730	9	ICICI	UPI	Coffee shop	755.00
1731	9	ICICI	UPI	Injection	8903.00
1732	9	ICICI	CREDIT CARD	Injection	1170.00
1733	9	HDFC	UPI	Pharm	43702.00
1734	9	CASH	CASH	total	136677.00
2027	10	ICICI	UPI	OPD(NIGHT)	14990.00
2028	10	ICICI	UPI	IPD(night)	30200.00
2029	10	ICICI	CREDIT CARD	IPD(night)	35700.00
2030	10	ICICI	DEBIT CARD	OPD	50000.00
2031	10	ICICI	UPI	OPD	145510.00
2032	10	ICICI	UPI	IPD	58300.00
2033	10	ICICI	DEBIT CARD	INJECTION	2019.00
2034	10	ICICI	UPI	INJECTION	25545.00
2035	10	ICICI	UPI	Coffee Shop 	1170.00
2036	10	ICICI	UPI	Canteen	770.00
2037	10	HDFC	UPI	Pharmacy (UPI)	48435.00
2038	10	CASH	CASH	TOTAL	348368.00
2191	11	ICICI	UPI	IPD(NIGHT)	30000.00
2192	11	ICICI	DEBIT CARD	OPD	2420.00
2193	11	ICICI	UPI	OPD	48480.00
2194	11	ICICI	CREDIT CARD	IPD	4590.00
2195	11	ICICI	UPI	IPD	22000.00
2196	11	ICICI	UPI	Medicine Sales 	4514.00
2197	11	ICICI	UPI	Injection	14964.00
2198	11	ICICI	UPI	Coffee Shop 	820.00
2199	11	ICICI	UPI	 Canteen	490.00
2200	11	HDFC	UPI	Pharmacy 	27391.00
2201	11	HDFC	CREDIT CARD	Pharmacy 	5100.00
2202	11	CASH	CASH	Total	179475.00
\.


--
-- Data for Name: daily_pharmacy_income; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_pharmacy_income (id, report_id, ot_ward_total, acme_new_total, parking, coffee_shop, canteen_income, credit_card_charges_night, training_fee, humankind_sales, misc_income) FROM stdin;
\.


--
-- Data for Name: daily_service_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_service_lines (id, report_id, service_id, rate, quantity, amount, is_night_entry, narration) FROM stdin;
7616	11	3	550.00	8	4400.00	f	\N
7617	11	4	600.00	5	3000.00	f	\N
7618	11	2	450.00	35	15750.00	f	\N
7619	11	5	700.00	7	4900.00	f	\N
7620	11	6	700.00	5	3500.00	f	\N
7621	11	16	1200.00	5	6000.00	f	\N
7622	11	47	700.00	2	1400.00	f	\N
7623	11	26	1000.00	1	1000.00	f	\N
7624	11	19	2000.00	1	2000.00	f	\N
7625	11	38	0.00	1	2000.00	f	Semen freezing 1months\n
7626	11	35	300.00	1	300.00	f	\N
7627	11	21	600.00	1	600.00	f	\N
7628	11	30	0.00	1	540.00	f	RPD Dental\n
7629	11	1	0.00	2	22000.00	f	\N
7630	11	43	0.00	3	125000.00	f	\N
2289	6	4	600.00	2	1200.00	f	\N
2290	6	2	450.00	12	5400.00	f	\N
2106	5	43	0.00	1	9000.00	f	\N
2107	5	7	0.00	1	1370.00	f	\N
2108	5	8	0.00	1	1900.00	f	\N
2109	5	44	0.00	1	72100.00	f	\N
2110	5	48	500.00	1	500.00	f	\N
2111	5	25	10000.00	2	20000.00	f	\N
2112	5	3	550.00	3	1650.00	f	\N
2113	5	2	450.00	15	6750.00	f	\N
2114	5	9	0.00	1	150.00	f	\N
2115	5	10	0.00	1	37060.00	f	\N
2116	5	5	700.00	4	2800.00	f	\N
2117	5	6	700.00	4	2800.00	f	\N
2118	5	16	1200.00	2	2400.00	f	\N
2119	5	47	700.00	2	1400.00	f	\N
2120	5	15	0.00	1	43100.00	f	\N
2121	5	49	0.00	1	58769.00	f	\N
2122	5	41	0.00	1	14878.00	f	\N
2291	6	5	700.00	4	2800.00	f	\N
2292	6	6	700.00	1	700.00	f	\N
2293	6	51	700.00	1	700.00	f	\N
2294	6	33	0.00	1	125890.00	f	\N
2295	6	10	0.00	1	18556.00	f	\N
2296	6	9	0.00	1	90.00	f	\N
2297	6	8	0.00	1	1740.00	f	\N
2298	6	7	0.00	1	1720.00	f	\N
2299	6	15	0.00	1	17920.00	f	\N
2300	6	41	0.00	1	10060.00	f	\N
2301	6	42	0.00	1	2000.00	t	\N
2302	6	13	600.00	1	600.00	t	\N
1761	3	1	0.00	1	30000.00	f	\N
1762	3	7	0.00	1	2290.00	f	\N
1763	3	8	0.00	1	2570.00	f	\N
1764	3	36	2160.00	1	2160.00	f	\N
1765	3	40	1000.00	1	1000.00	f	\N
1766	3	44	0.00	10	251170.00	f	\N
1767	3	33	0.00	1	15600.00	f	\N
1768	3	39	12000.00	1	12000.00	f	\N
1769	3	31	0.00	1	3000.00	f	\N
1770	3	3	550.00	2	1100.00	f	\N
1771	3	4	600.00	4	2400.00	f	\N
1772	3	2	450.00	47	21150.00	f	\N
1773	3	15	0.00	1	43252.00	f	\N
1774	3	30	400.00	1	400.00	f	\N
1775	3	10	0.00	1	68372.00	f	\N
1776	3	41	0.00	1	20030.00	f	\N
1777	3	14	0.00	1	26368.00	f	\N
1778	3	5	700.00	2	1400.00	f	\N
1779	3	6	700.00	3	2100.00	f	\N
1780	3	16	1200.00	9	10800.00	f	\N
1781	3	42	0.00	1	2000.00	t	\N
1782	3	46	0.00	1	1000.00	t	\N
1783	3	4	600.00	1	600.00	t	\N
2303	6	50	0.00	1	1450.00	t	\N
7631	11	44	0.00	1	4500.00	f	\N
7632	11	11	0.00	1	4514.00	f	\N
7633	11	10	0.00	1	46660.00	f	\N
7634	11	9	0.00	1	170.00	f	\N
7635	11	8	0.00	1	2620.00	f	\N
7636	11	7	0.00	1	1800.00	f	\N
7637	11	59	0.00	1	90.00	f	\N
374	1	1	0.00	4	92000.00	f	\N
375	1	7	0.00	1	2950.00	f	\N
376	1	8	0.00	1	2270.00	f	\N
377	1	29	5000.00	2	10000.00	f	\N
378	1	20	9000.00	1	9000.00	f	\N
379	1	26	1000.00	2	2000.00	f	\N
380	1	19	2000.00	1	2000.00	f	\N
381	1	21	600.00	2	1200.00	f	\N
382	1	12	0.00	1	14240.00	f	\N
383	1	28	4000.00	1	4000.00	f	\N
384	1	25	10000.00	1	10000.00	f	\N
385	1	11	0.00	1	1061.00	f	\N
386	1	31	0.00	1	1000.00	f	\N
387	1	3	550.00	5	2750.00	f	\N
388	1	4	600.00	5	3000.00	f	\N
389	1	2	450.00	28	12600.00	f	\N
390	1	15	0.00	1	24198.00	f	\N
391	1	30	400.00	2	800.00	f	\N
392	1	9	0.00	1	150.00	f	\N
393	1	10	0.00	1	67667.00	f	\N
394	1	22	500.00	5	2500.00	f	\N
395	1	14	0.00	1	30300.00	f	\N
396	1	18	1100.00	1	1100.00	f	\N
397	1	5	700.00	3	2100.00	f	\N
398	1	6	700.00	6	4200.00	f	\N
399	1	16	1200.00	2	2400.00	f	\N
400	1	17	1200.00	2	2400.00	f	\N
401	1	1	0.00	2	50000.00	t	\N
402	1	13	600.00	1	600.00	t	\N
403	1	3	550.00	1	550.00	t	\N
404	1	4	600.00	1	600.00	t	\N
405	1	2	450.00	1	450.00	t	\N
406	1	14	0.00	1	11280.00	t	\N
407	1	5	700.00	1	700.00	t	\N
3400	8	3	550.00	2	1100.00	f	\N
3401	8	4	600.00	4	2400.00	f	\N
3402	8	2	450.00	20	9000.00	f	\N
3403	8	5	700.00	7	4900.00	f	\N
3404	8	16	1200.00	1	1200.00	f	\N
3405	8	40	1000.00	1	1000.00	f	\N
3406	8	53	1600.00	1	1600.00	f	\N
3407	8	14	0.00	1	10890.00	f	\N
3408	8	1	0.00	4	74000.00	f	\N
3409	8	33	0.00	1	2570.00	f	\N
3410	8	8	0.00	1	890.00	f	\N
3411	8	41	0.00	1	21120.00	f	\N
3412	8	10	0.00	1	47360.00	f	\N
3413	8	15	0.00	1	31180.00	f	\N
3414	8	7	0.00	1	2510.00	f	\N
3415	8	9	0.00	1	100.00	f	\N
3416	8	50	0.00	1	0.00	f	\N
3417	8	46	0.00	1	550.00	f	Patient Return for New Case@ Paedia.(NIght)
3418	8	42	0.00	1	40000.00	t	\N
3419	8	3	550.00	1	550.00	t	\N
3420	8	2	450.00	1	450.00	t	\N
7638	11	14	0.00	1	850.00	f	\N
7639	11	41	0.00	1	55190.00	f	\N
1079	2	1	0.00	2	45000.00	f	\N
1080	2	7	0.00	1	2250.00	f	\N
1081	2	8	0.00	1	2145.00	f	\N
1082	2	36	2160.00	1	2160.00	f	\N
1083	2	33	0.00	2	33500.00	f	\N
1084	2	29	5000.00	1	5000.00	f	\N
1085	2	35	300.00	1	300.00	f	\N
1086	2	26	1000.00	2	2000.00	f	\N
1087	2	19	2000.00	2	4000.00	f	\N
1088	2	38	0.00	1	150000.00	f	\N
1089	2	3	550.00	4	2200.00	f	\N
1090	2	4	600.00	5	3000.00	f	\N
1091	2	2	450.00	28	12600.00	f	\N
1092	2	15	0.00	1	23252.00	f	\N
1093	2	9	0.00	1	200.00	f	\N
1094	2	10	0.00	1	52032.00	f	\N
1095	2	22	500.00	2	1000.00	f	\N
1096	2	14	0.00	1	44541.00	f	\N
1097	2	5	700.00	6	4200.00	f	\N
1098	2	6	700.00	1	700.00	f	\N
1099	2	37	1000.00	1	1000.00	f	\N
1100	2	16	1200.00	2	2400.00	f	\N
1101	2	17	1200.00	1	1200.00	f	\N
1102	2	1	0.00	1	40000.00	t	\N
1103	2	33	0.00	2	79080.00	t	\N
1104	2	14	0.00	1	1160.00	t	\N
7640	11	42	0.00	1	30000.00	t	\N
7641	11	13	600.00	2	1200.00	t	\N
7642	11	50	0.00	1	260.00	t	\N
5071	9	1	0.00	1	2000.00	f	\N
5072	9	7	0.00	1	1790.00	f	\N
5073	9	8	0.00	1	1995.00	f	\N
5074	9	56	9000.00	1	9000.00	f	\N
5075	9	33	0.00	2	29580.00	f	\N
5076	9	57	22000.00	1	22000.00	f	\N
5077	9	35	300.00	1	300.00	f	\N
5078	9	26	1000.00	2	2000.00	f	\N
5079	9	21	600.00	2	1200.00	f	\N
5080	9	54	3500.00	1	3500.00	f	\N
5081	9	11	0.00	1	1409.00	f	\N
5082	9	31	0.00	1	1000.00	f	\N
2804	7	1	0.00	1	15000.00	f	\N
2805	7	7	0.00	1	850.00	f	\N
2806	7	8	0.00	1	1100.00	f	\N
2807	7	21	600.00	1	600.00	f	\N
2808	7	12	0.00	1	4050.00	f	\N
2809	7	3	550.00	2	1100.00	f	\N
2810	7	2	450.00	9	4050.00	f	\N
2811	7	15	0.00	1	29400.00	f	\N
2812	7	9	0.00	1	60.00	f	\N
2813	7	10	0.00	1	28280.00	f	\N
2814	7	22	500.00	1	500.00	f	\N
2815	7	52	1100.00	1	1100.00	f	\N
2816	7	14	0.00	1	1300.00	f	\N
2817	7	5	700.00	3	2100.00	f	\N
2818	7	42	0.00	2	27000.00	t	IPD Adm Maibam Dhoni\n IPD Adm Huidrom Sushila\n\n
2819	7	45	0.00	3	19000.00	t	 IPD Dis. Monalisa Thokchom \nIPD Dis. Baby of Thokchom Puspa\n IPD Dis. Leishanghem Ranjana\n
2820	7	31	0.00	1	1000.00	t	Night
2821	7	2	450.00	1	450.00	t	Night
2822	7	50	0.00	1	3450.00	t	\N
5083	9	3	550.00	4	2200.00	f	\N
5084	9	4	600.00	12	7200.00	f	\N
5085	9	55	1200.00	1	1200.00	f	\N
5086	9	2	450.00	51	22950.00	f	\N
5087	9	15	0.00	1	10073.00	f	\N
5088	9	9	0.00	1	270.00	f	\N
5089	9	10	0.00	1	72740.00	f	\N
5090	9	41	0.00	1	6450.00	f	\N
5091	9	14	0.00	1	33070.00	f	\N
5092	9	18	1100.00	1	1100.00	f	\N
5093	9	5	700.00	10	7000.00	f	\N
5094	9	6	700.00	5	3500.00	f	\N
5095	9	16	1200.00	5	6000.00	f	\N
5096	9	47	700.00	2	1400.00	f	\N
5097	9	17	1200.00	1	1200.00	f	\N
5098	9	\N	0.00	1	26.00	f	\N
5099	9	42	0.00	1	10000.00	t	Re- Adv
6766	10	1	0.00	2	41000.00	f	\N
6767	10	7	0.00	1	2300.00	f	\N
6768	10	8	0.00	1	2180.00	f	\N
6769	10	59	0.00	1	700.00	f	\N
6770	10	44	0.00	9	137700.00	f	\N
6771	10	20	9000.00	2	18000.00	f	\N
6772	10	19	2000.00	1	2000.00	f	\N
6773	10	38	0.00	2	300000.00	f	\N
6774	10	58	12000.00	1	12000.00	f	\N
6775	10	11	0.00	1	210.00	f	\N
6776	10	3	550.00	7	3850.00	f	\N
6777	10	4	600.00	5	3000.00	f	\N
6778	10	2	450.00	23	10350.00	f	\N
6779	10	15	0.00	1	27564.00	f	\N
6780	10	9	0.00	1	300.00	f	\N
6781	10	10	0.00	1	84359.00	f	\N
6782	10	22	500.00	2	1000.00	f	\N
6783	10	41	0.00	1	1070.00	f	\N
6784	10	14	0.00	1	19510.00	f	\N
6785	10	18	1100.00	1	1100.00	f	\N
6786	10	5	700.00	6	4200.00	f	\N
6787	10	16	1200.00	4	4800.00	f	\N
6788	10	53	1600.00	1	1600.00	f	\N
6789	10	17	1200.00	1	1200.00	f	\N
6790	10	42	0.00	1	35000.00	t	\N
6791	10	45	0.00	1	30200.00	t	\N
6792	10	20	9000.00	1	9000.00	t	\N
6793	10	21	600.00	1	600.00	t	\N
6794	10	11	0.00	1	209.00	t	\N
6795	10	31	0.00	1	1000.00	t	\N
6796	10	4	600.00	1	600.00	t	\N
6797	10	2	450.00	2	900.00	t	\N
6798	10	50	0.00	1	2200.00	t	\N
6799	10	6	700.00	1	700.00	t	\N
6800	10	16	1200.00	1	1200.00	t	\N
\.


--
-- Data for Name: daily_staff_advances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_staff_advances (id, report_id, staff_id, staff_name, amount) FROM stdin;
\.


--
-- Data for Name: department_leaders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.department_leaders (id, department_id, head_staff_id, subhead_staff_id, created_at, updated_at) FROM stdin;
1	6	2	\N	2026-07-14 11:47:51.275771	2026-07-14 11:47:51.275771
34	21	\N	\N	2026-07-15 06:54:29.520461	2026-07-15 06:54:29.520461
35	22	\N	\N	2026-07-18 05:36:11.2332	2026-07-18 05:36:11.2332
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, name, floor, head, active, created_at, updated_at) FROM stdin;
1	Operations	1st Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
2	Management	1st Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
3	OPD	Ground Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
4	Housekeeping	Any Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
5	MTS	Any Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
7	Front Office 	Ground Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
8	NICU	Second Floor 		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
9	CSSD	1st Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
10	Dispensary 	Ground Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
11	Purchase and Store	Ground Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
12	Canteen 	Ground Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
13	RMO	Any floor 		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
14	Radiology 	3rd floor 		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
15	Assisted Reproductive Technology (ART)	2nd Floor 		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
16	Administrative 	1st Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
17	Human Resources 	1st Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
18	Asthetic 	2nd Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
19	OT	1st Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
20	Ward	2nd Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
6	Accounts	1st Floor	Ngangkham Tarunkumar Singh	t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646
21	Nursing Admin	1st Floor		t	2026-07-15 06:54:29.442996	2026-07-15 06:54:29.442996
22	ICU/HDU	2nd Floor		t	2026-07-18 05:36:11.164643	2026-07-18 05:36:11.164643
\.


--
-- Data for Name: designations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.designations (id, name, active, created_at, updated_at) FROM stdin;
1	Lab Technician	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
2	Front Desk Coordinator	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
3	Inventory Associate	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
4	Pharmacy Assistant	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
5	System Administrator	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
6	HR Executive	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
7	Floor Master	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
8	Nursing officer 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
9	Front  Office Executive	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
10	Chief Operating Officer/Medical Superintendent 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
11	RMO/Clinical Assistant 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
12	Pharmacist 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
13	Nursing Supervisor 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
14	Customer Relationship Officer	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
15	Trainee staff Nurse 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
16	Andrologist cum Trainee Embryologist 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
17	Nursing Incharge 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
18	Assistant Nursing Incharge 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
19	Assistant Lab. Director	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
20	Incharge 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
21	Assistant Incharge	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
22	General Manager 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
23	Assistant General Manager 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
24	Manager	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
25	Assistant Manager 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
26	Pathologist 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
27	Multi Tasking Staff	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
28	Laboratory Technician 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
29	Assistant Cook	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
30	Maintenance Executive 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
31	CSSD Technician 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
32	Dental Surgeon 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
33	Managing Director 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
34	Nursing Superintendent 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
35	OT Technician 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
36	Consultant OBGY	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
37	Embryologist 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
38	Consultant Anaesthetist 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
39	Operations Executive 	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
40	Executive Marketing & BD	t	2026-07-14 09:14:46.681281	2026-07-14 09:14:46.681281
41	Account Assistant	t	2026-07-14 11:17:49.234655	2026-07-14 11:17:49.234655
42	INFECTION CONTROL NURSE	t	2026-07-15 06:53:41.734946	2026-07-15 06:53:41.734946
43	X-Ray Technician	t	2026-07-19 11:34:06.839914	2026-07-19 11:34:06.839914
\.


--
-- Data for Name: encounters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.encounters (id, appointment_id, symptoms, diagnosis, vitals, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: expense_catalog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_catalog (id, category, item_name, default_amount, sort_order, active, created_at, updated_at) FROM stdin;
4	URUP	SALARY	0.00	0	t	2026-07-16 08:01:56.823535	2026-07-16 08:01:56.823535
5	URUP	ELECTRIC RECHARGE	0.00	0	t	2026-07-16 08:03:17.379706	2026-07-16 08:03:17.379706
6	REPAIRING_&_SERVICING	VEHICLE	0.00	0	t	2026-07-16 08:06:57.862656	2026-07-16 08:06:57.862656
7	REPAIRING_&_SERVICING	MEDICAL INSTRUMENTS	0.00	0	t	2026-07-16 08:07:13.132449	2026-07-16 08:07:13.132449
8	URUP	URUP EXPENSES	0.00	0	t	2026-07-16 08:09:28.559926	2026-07-16 08:09:28.559926
9	WATER	WATER TANKER	0.00	0	t	2026-07-16 08:15:34.991087	2026-07-16 08:15:34.991087
10	ACON	WATER TANKER	0.00	0	t	2026-07-16 08:17:48.164838	2026-07-16 08:17:48.164838
12	WATER	WATER BOTTLE	0.00	0	t	2026-07-16 08:19:13.56498	2026-07-16 08:19:13.56498
13	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	0.00	0	t	2026-07-16 08:26:57.872117	2026-07-16 08:26:57.872117
14	ACON	PETROL	0.00	0	t	2026-07-16 08:27:31.56888	2026-07-16 08:27:31.56888
15	REFRESHMENT	OT	0.00	0	t	2026-07-16 09:16:11.732927	2026-07-16 09:16:11.732927
16	REFRESHMENT	IVF	0.00	0	t	2026-07-16 09:16:27.926698	2026-07-16 09:16:27.926698
19	POSTAL_&_COURIER_CHARGES	MEDICINE ITEMS (HUMANKIND)	0.00	0	t	2026-07-16 09:23:05.463514	2026-07-16 09:23:24.284
20	DAILY_COLLECTION	SANATHOI (20000*2)	0.00	0	t	2026-07-16 11:55:21.836963	2026-07-16 11:55:21.836963
21	DAILY_COLLECTION	SANATHOI (15000*1)	0.00	0	t	2026-07-16 11:56:05.196724	2026-07-16 11:56:05.196724
22	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	0.00	0	t	2026-07-16 11:56:52.589545	2026-07-16 11:56:52.589545
23	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	0.00	0	t	2026-07-16 11:57:14.606735	2026-07-16 11:57:14.606735
24	DAILY_COLLECTION	ASWF(20000*2)	0.00	0	t	2026-07-16 11:57:47.675137	2026-07-16 11:57:47.675137
25	INVESTMENT	LORENDRO MARUP	0.00	0	t	2026-07-16 12:00:57.636932	2026-07-16 12:00:57.636932
27	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DDS	0.00	0	t	2026-07-16 12:14:16.214707	2026-07-16 12:14:16.214707
28	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DMD	0.00	0	t	2026-07-16 12:14:38.529669	2026-07-16 12:14:38.529669
29	VENDOR	USG WHOLE ABDOMEN CHARGES FOR DR.SANJIT	0.00	0	t	2026-07-16 12:15:45.058002	2026-07-16 12:15:45.058002
30	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR TOMORROW	0.00	0	t	2026-07-16 12:20:47.121582	2026-07-16 12:20:47.121582
31	STAFF	STAFF SALARY	0.00	0	t	2026-07-17 09:03:16.43834	2026-07-17 09:03:16.43834
32	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	0.00	0	t	2026-07-17 09:18:09.489683	2026-07-17 09:18:09.489683
33	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	0.00	0	t	2026-07-17 09:19:24.332935	2026-07-17 09:19:24.332935
34	CANTEEN_EXPENSES	CANTEEN MARKETING-(DRY ITEMS)	0.00	0	t	2026-07-17 09:20:25.384648	2026-07-17 09:20:25.384648
35	RECHARGE	MOBILE RECHARGE FOR FRONT DEPT.	0.00	0	t	2026-07-17 09:50:31.808549	2026-07-17 09:50:31.808549
36	DONATION	DONATION	0.00	0	t	2026-07-17 11:30:52.854288	2026-07-17 11:30:52.854288
37	PROGRAM_&_FUNCTION	ACME	0.00	0	t	2026-07-17 11:39:07.015178	2026-07-17 11:39:07.015178
3	CANTEEN_EXPENSES	CANTEEN MARKETING-(DRY ITEMS)	0.00	0	t	2026-07-16 07:17:51.329552	2026-07-17 11:45:01.461
18	CANTEEN_EXPENSES	CANTEEN-(CHICKEN)	0.00	0	t	2026-07-16 09:19:48.1532	2026-07-17 11:45:22.65
17	CANTEEN_EXPENSES	CANTEEN(FISH)	0.00	0	t	2026-07-16 09:19:15.698142	2026-07-17 11:45:34.659
2	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	0.00	0	t	2026-07-16 07:16:54.371775	2026-07-17 11:45:45.058
26	COFFEE_SHOP_MARKETING	COFFEE SHOP (DISPO)	0.00	0	t	2026-07-16 12:04:19.219776	2026-07-17 11:46:03.503
1	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	0.00	0	t	2026-07-16 07:14:52.525502	2026-07-17 11:46:19.4
38	HOSPITAL_EXPENSES	PRINTING & STATIONERY ITEMS	0.00	0	t	2026-07-17 11:48:49.305889	2026-07-17 11:48:49.305889
39	CANTEEN_EXPENSES	CANTEEN DISPO	0.00	0	t	2026-07-17 11:51:15.831573	2026-07-17 11:51:15.831573
40	STORE_MARKETING	MEDICINE & CONSUMABLES ITEMS	0.00	0	t	2026-07-17 11:54:25.941279	2026-07-17 11:54:25.941279
41	ACON	ACON CONSTRUCTION	0.00	0	t	2026-07-17 11:57:45.098994	2026-07-17 11:57:45.098994
42	ELECTRONICS	ACME	0.00	0	t	2026-07-17 12:04:25.647765	2026-07-17 12:04:25.647765
43	ACME_ASSET_EXPENSES	ASSET EXPENSES	0.00	0	t	2026-07-20 12:21:55.290434	2026-07-20 12:21:55.290434
44	IVF_EXPENSES	IVF EXPENSES	0.00	0	t	2026-07-23 12:06:09.417975	2026-07-23 12:06:09.417975
45	STORE_MARKETING	GAS 	0.00	0	t	2026-07-23 12:09:17.858506	2026-07-23 12:09:17.858506
\.


--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_categories (id, code, label, sort_order, active, created_at, updated_at) FROM stdin;
2	VENDOR	Vendor	20	t	2026-07-14 11:19:16.687237	2026-07-14 11:19:16.687237
3	MISC	Misc	30	t	2026-07-14 11:19:16.687237	2026-07-14 11:19:16.687237
1	SALARY	Salary	10	f	2026-07-14 11:19:16.687237	2026-07-15 11:58:01.94
4	REFRESHMENT	REFRESHMENT	21	t	2026-07-15 12:00:09.998156	2026-07-15 12:00:09.998156
5	DAILY_COLLECTION	DAILY COLLECTION	22	t	2026-07-15 12:01:01.985654	2026-07-15 12:01:01.985654
6	MARKETING	MARKETING	23	t	2026-07-16 07:07:02.672242	2026-07-16 07:11:30.875
13	URUP	URUP EXPENSES	24	t	2026-07-16 08:01:24.743471	2026-07-16 08:01:35.669
15	WATER	WATER	28	t	2026-07-16 08:14:40.185583	2026-07-16 08:14:40.185583
16	ACON	ACON EXPENSES	27	t	2026-07-16 08:17:18.947286	2026-07-16 08:17:18.947286
17	POSTAL_&_COURIER_CHARGES	POSTAL & COURIER  CHARGES	26	t	2026-07-16 09:22:03.363559	2026-07-16 09:22:03.363559
18	INVESTMENT	INVESTMENT	29	t	2026-07-16 11:59:43.621309	2026-07-16 11:59:43.621309
19	INTEREST	INTEREST	31	t	2026-07-16 12:00:30.457814	2026-07-16 12:00:30.457814
20	MEDICAL_CONSULTANT_CHARGES	MEDICAL CONSULTANT CHARGES	32	t	2026-07-16 12:12:09.626441	2026-07-16 12:13:21.757
21	STAFF	STAFF	33	t	2026-07-17 09:02:55.079415	2026-07-17 09:02:55.079415
22	COFFEE_SHOP_MARKETING	Coffee Shop Expenses	34	t	2026-07-17 09:14:58.275067	2026-07-17 09:16:34.737
23	CANTEEN_EXPENSES	Canteen Expenses	35	t	2026-07-17 09:18:57.37339	2026-07-17 09:18:57.37339
24	RECHARGE	RECHARGE	36	t	2026-07-17 09:49:31.260359	2026-07-17 09:49:31.260359
25	DONATION	DONATION	37	t	2026-07-17 11:30:30.466036	2026-07-17 11:30:30.466036
26	HOME	Home	38	t	2026-07-17 11:36:54.906817	2026-07-17 11:36:54.906817
27	PROGRAM_&_FUNCTION	PROGRAM & FUNCTION	39	t	2026-07-17 11:38:25.012213	2026-07-17 11:38:25.012213
28	HOSPITAL_EXPENSES	HOSPITAL EXPENSES	40	t	2026-07-17 11:47:54.722878	2026-07-17 11:47:54.722878
29	STORE_MARKETING	STORE MARKETING	0	t	2026-07-17 11:53:44.609785	2026-07-17 11:53:44.609785
30	ELECTRONICS	ELECTRONICS	41	t	2026-07-17 12:03:48.5384	2026-07-17 12:03:48.5384
14	REPAIRING_&_SERVICING	REPAIRING & SERVICING(Vehicle)	25	t	2026-07-16 08:06:44.586423	2026-07-18 12:22:20.786
31	REPAIRING_&_SERVICCING	REPAIRING & SERVICING(INSTRUMENT & OTHERS)	42	t	2026-07-18 12:23:43.797737	2026-07-18 12:26:03.005
32	ACME_ASSET_EXPENSES	ACME ASSET EXPENSES	13	t	2026-07-20 12:21:29.808046	2026-07-20 12:21:29.808046
33	COURIER_&_POSTAL	COURIER & POSTAL	43	t	2026-07-20 12:46:07.514154	2026-07-20 12:46:07.514154
34	PETROL	PETROL	45	t	2026-07-21 11:31:50.955168	2026-07-21 11:31:50.955168
35	BAMON_KAMPU_CONSTRUCTION	BAMON KAMPU CONSTRUCTION	46	t	2026-07-21 11:35:33.135134	2026-07-21 11:35:33.135134
36	IVF_EXPENSES	IVF EXPENSES	47	t	2026-07-23 12:05:40.773922	2026-07-23 12:05:40.773922
37	PRINTING_AND_STATIONARY	PRINTING AND STATIONARY	48	t	2026-07-25 07:20:50.219172	2026-07-25 07:20:50.219172
\.


--
-- Data for Name: grn_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grn_items (id, grn_id, po_item_id, item_id, item_name, received_qty, free_qty, unit_rate, gst_percent, line_value, batch, expiry_date, notes) FROM stdin;
\.


--
-- Data for Name: grns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grns (id, po_id, vendor_id, no_po_reason, grn_no, grn_date, date_of_delivery, remarks, status, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: immunization_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.immunization_records (id, patient_id, schedule_id, vaccine_code, vaccine_name, dose_label, administered_at, administered_by_staff_id, batch_no, manufacturer, site, route, adverse_event, notes, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: immunization_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.immunization_schedules (id, vaccine_code, vaccine_name, dose_label, beneficiary_type, due_age_days, due_age_label, max_age_days, dose_amount, route, site, applies_in, source, notes, active, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_items (id, sku, name, category, unit, quantity, reorder_level, supplier, location, expiry_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: item_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.item_types (id, name, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.items (id, name, item_type_id, unit, rate, gst_percent, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_requests (id, request_no, staff_id, leave_type, is_half_day, start_date, end_date, reason, status, reviewed_at, reviewer_note, forwarded_to_staff_id, approver_ids, supporting_document, created_at, updated_at) FROM stdin;
1	LV-TLGO8	3	Loss of Pay	t	2026-07-15 18:30:00	2026-07-15 18:30:00	Personal	Pending	\N	\N	\N	[2]	\N	2026-07-15 11:20:06.208218	2026-07-15 11:20:06.208218
2	LV-B9EXM	57	Casual Leave	t	2026-07-21 18:30:00	2026-07-21 18:30:00	Ushop ama yaojabagine	Pending	\N	\N	\N	[]	\N	2026-07-22 10:40:32.087275	2026-07-22 10:40:32.087275
\.


--
-- Data for Name: leave_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_types (id, name, max_days, active, payable, payment_rate, created_at, updated_at) FROM stdin;
1	Casual Leave	7	t	t	100.00	2026-07-14 09:14:46.623674	2026-07-14 09:14:46.623674
2	Sick Leave	5	t	t	100.00	2026-07-14 09:14:46.623674	2026-07-14 09:14:46.623674
3	Maternity Leave	180	t	t	50.00	2026-07-14 09:14:46.623674	2026-07-14 09:14:46.623674
4	Paternity Leave	10	t	t	50.00	2026-07-14 09:14:46.623674	2026-07-14 09:14:46.623674
5	Loss of Pay	365	t	f	0.00	2026-07-14 09:14:46.623674	2026-07-14 09:14:46.623674
\.


--
-- Data for Name: medicines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.medicines (id, sku, name, generic_name, form, strength, stock, reorder_level, price, batch_no, expiry_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, sender_id, receiver_id, channel_type, department_id, content, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, type, link, read, created_at, updated_at) FROM stdin;
1	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	New Leave Request	Maibam Romita Devi requested leave: LV-TLGO8 (Loss of Pay)	info	/hr/leaves	f	2026-07-15 11:20:06.23505	2026-07-15 11:20:06.23505
2	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	New Shift Schedule	You have been assigned a new shift starting from 2026-06-01 to 2026-06-30.	info	/hr/roster	f	2026-07-16 05:26:39.625684	2026-07-16 05:26:39.625684
3	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	New Leave Request	Subhashchandra Konjengbam requested leave: LV-B9EXM (Casual Leave)	info	/hr/leaves	t	2026-07-22 10:40:32.163197	2026-07-22 10:40:32.163197
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patients (id, mrn, name, age, gender, phone, address, blood_group, allergies, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payslips; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payslips (id, staff_id, month, basic_salary, hra, conveyance, medical, special, epf, esi, professional_tax, other_deductions, late_attendance, leave_days_taken, leave_deduction, net_salary, version, status, hr_notes, coo_notes, accounts_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: po_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.po_items (id, po_id, item_name, category, unit, ordered_qty, unit_rate, gst_percent, line_value, created_at) FROM stdin;
\.


--
-- Data for Name: po_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.po_payments (id, po_id, payment_date, amount, payment_mode, reference_no, remarks, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: prescription_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.prescription_lines (id, prescription_id, medicine_id, dosage, duration, quantity, instructions) FROM stdin;
\.


--
-- Data for Name: prescriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.prescriptions (id, patient_id, doctor_id, encounter_id, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_orders (id, po_no, po_date, vendor_id, po_status, payment_status, total_value, remarks, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: rosters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rosters (id, staff_id, department_id, shift_id, start_date, end_date, notes, created_at, updated_at) FROM stdin;
1	4	6	6	2026-06-01	2026-06-30		2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941
\.


--
-- Data for Name: service_catalog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_catalog (id, department, service_name, default_rate, sort_order, default_show, created_at, updated_at) FROM stdin;
2	OPD	OLD CASE	450.00	0	t	2026-07-15 11:39:37.98347	2026-07-15 11:39:37.98347
3	OPD	NEW CASE	550.00	0	t	2026-07-15 11:40:00.434355	2026-07-15 11:40:00.434355
4	OPD	NEW CASE - REGISTRATION	600.00	0	t	2026-07-15 11:40:42.359788	2026-07-15 11:40:42.359788
5	OPD	TVS GYNAE	700.00	0	t	2026-07-15 11:41:08.092748	2026-07-15 11:41:08.092748
6	OPD	TVS OBS	700.00	0	t	2026-07-15 11:41:26.319776	2026-07-15 11:41:26.319776
7	MINOR_INCOME	CANTEEN INCOME	0.00	0	f	2026-07-16 09:01:47.179354	2026-07-16 09:01:47.179354
8	MINOR_INCOME	COFFEE SHOP INCOME	0.00	0	f	2026-07-16 09:02:12.370919	2026-07-16 09:02:12.370919
9	MINOR_INCOME	PARKING INCOME	0.00	0	f	2026-07-16 09:02:38.009515	2026-07-16 09:02:38.009515
10	PHARMACY	PHARMACY DAILY SALES	0.00	0	f	2026-07-16 11:46:25.878273	2026-07-16 11:46:25.878273
11	PHARMACY	MEDICINE SALES 	0.00	0	f	2026-07-16 11:47:07.025764	2026-07-16 11:47:07.025764
12	IVF	IVF -INJECTION SALES	0.00	0	f	2026-07-16 11:51:54.876586	2026-07-16 11:51:54.876586
13	OPD	EMERGENCY OPD	600.00	0	f	2026-07-16 12:31:19.958624	2026-07-16 12:31:56.468
15	OPD	OPD-INJECTION	0.00	0	f	2026-07-17 06:28:58.486629	2026-07-17 06:28:58.486629
19	OPD	HSG ( X-RAY)	2000.00	0	f	2026-07-17 06:44:25.42742	2026-07-17 06:44:25.42742
20	OPD	ELECTROCAUTERY	9000.00	0	f	2026-07-17 06:46:02.778293	2026-07-17 06:46:02.778293
21	OPD	IRON INFUSION CHARGE	600.00	0	f	2026-07-17 06:46:26.231083	2026-07-17 06:46:26.231083
22	MINOR_INCOME	PRIVILEGE CARD 	500.00	0	f	2026-07-17 06:51:23.580791	2026-07-17 06:51:23.580791
23	MINOR_INCOME	AGNY CARD	300.00	0	f	2026-07-17 06:51:41.35317	2026-07-17 06:51:41.35317
24	MINOR_INCOME	PRIVILEGE CARD RENEWAL	300.00	0	f	2026-07-17 06:52:14.343523	2026-07-17 06:52:14.343523
26	IVF	HSA-1	1000.00	0	f	2026-07-17 07:17:27.905634	2026-07-17 07:17:27.905634
27	IVF	HSA-2	1600.00	0	f	2026-07-17 07:17:54.344888	2026-07-17 07:17:54.344888
28	OUTSOURCING	LIFECELL(QUADRUPLE MARKER WITH NIPT)	4000.00	0	f	2026-07-17 07:25:30.56575	2026-07-17 07:25:30.56575
29	IVF	DNA FREGMENTATION	5000.00	0	f	2026-07-17 07:26:19.327068	2026-07-17 07:26:19.327068
25	OUTSOURCING	LIFECELL- NON-INVASIVE PRENATAL TEST (NIPT)	10000.00	0	f	2026-07-17 06:53:32.6887	2026-07-17 08:18:22.296
30	DENTAL	OPD-OLD CASE	400.00	0	f	2026-07-17 08:20:13.221368	2026-07-17 08:20:13.221368
31	OUTSOURCING	NAOKON	0.00	0	f	2026-07-17 08:31:00.98061	2026-07-17 08:31:00.98061
35	OPD	DRESSING CHARGE	300.00	0	f	2026-07-17 10:11:36.905806	2026-07-17 10:12:32.111
36	DENTAL	COMPOSITE RESTORATION TOOTH	2160.00	0	f	2026-07-17 10:14:06.837061	2026-07-17 10:14:06.837061
38	IVF	IVF	0.00	0	f	2026-07-17 11:26:39.336096	2026-07-17 11:26:39.336096
37	OPD	TVS OBS TWINS	1000.00	0	t	2026-07-17 10:43:57.462777	2026-07-18 06:39:57.826
18	OPD	SEDATION	1100.00	0	t	2026-07-17 06:43:44.909751	2026-07-18 06:40:06.487
16	OPD	USG FWB	1200.00	0	t	2026-07-17 06:40:44.35032	2026-07-18 06:40:17.238
17	OPD	USG WHOLE ABDOMEN	1200.00	0	t	2026-07-17 06:41:21.890097	2026-07-18 06:40:30.111
39	IVF	IUI(A) WITH D/G	12000.00	0	f	2026-07-18 10:43:16.778212	2026-07-18 10:43:16.778212
14	SATYAM	SATYAM(LAB)MORNING	0.00	0	f	2026-07-16 12:36:13.005891	2026-07-18 12:00:39.118
41	SATYAM	SATYAM  LAB(EVENING)	0.00	0	f	2026-07-18 12:01:16.296545	2026-07-18 12:01:16.296545
1	IPD	ADMISSION(MORNING)	0.00	0	f	2026-07-15 11:38:58.084859	2026-07-18 12:03:50.718
42	IPD	ADMISSION(NIGHT)	0.00	0	f	2026-07-18 12:04:49.146015	2026-07-18 12:04:49.146015
43	IPD	ADMISSION(EVENING)	0.00	0	f	2026-07-18 12:05:25.629636	2026-07-18 12:05:25.629636
33	IPD	DISCHARGE(MORNING)	0.00	0	f	2026-07-17 09:41:22.392288	2026-07-18 12:05:50.29
44	IPD	DISCHARGE(EVENING)	0.00	0	f	2026-07-18 12:06:13.190586	2026-07-18 12:06:13.190586
45	IPD	DISCHARGE(NIGHT)	0.00	0	f	2026-07-18 12:06:36.100448	2026-07-18 12:06:36.100448
46	CASH_RETURN	CASH RETURN	0.00	0	f	2026-07-20 10:46:32.326149	2026-07-20 10:46:32.326149
47	OPD	USG PELVIS	700.00	0	t	2026-07-20 11:24:30.435234	2026-07-20 11:24:30.435234
48	IMMUNIZATION(NICU)	IMMUNIZATION(CARD)	500.00	0	f	2026-07-20 11:35:02.674872	2026-07-20 11:35:02.674872
49	IMMUNIZATION(NICU)	IMMUNIZATION INCOME	0.00	0	f	2026-07-20 12:08:11.517721	2026-07-20 12:08:11.517721
50	SATYAM	SATYAM (NIGHT)	0.00	0	f	2026-07-20 12:32:10.282038	2026-07-20 12:32:10.282038
51	OPD	USG LOWER ABDOMEN	700.00	0	f	2026-07-20 12:33:56.154561	2026-07-20 12:33:56.154561
52	DENTAL	RESTORATION (GIC)	1100.00	0	f	2026-07-21 11:22:09.83891	2026-07-21 11:22:09.83891
53	OPD	USG FWB TWINS	1600.00	0	f	2026-07-22 10:08:31.774269	2026-07-22 10:08:31.774269
40	OPD	CTG	1000.00	8	f	2026-07-18 10:43:55.998828	2026-07-22 11:26:06.02
54	OUTSOURCING	LIFECELL-COMBINED SCREENING WITH NIPT	3500.00	0	f	2026-07-23 09:48:44.697392	2026-07-23 09:48:44.697392
55	OPD	NT SCAN 	1200.00	0	f	2026-07-23 09:50:44.299411	2026-07-23 09:50:44.299411
56	OPD	D/C	9000.00	0	f	2026-07-23 09:51:27.57389	2026-07-23 09:51:27.57389
57	IVF	DOUBLE IUI(2)	22000.00	0	f	2026-07-23 09:53:45.260322	2026-07-23 09:53:45.260322
58	OPD	MC DONALD SUTURING	12000.00	0	f	2026-07-25 06:43:03.591515	2026-07-25 06:43:03.591515
59	OTHER_INCOME	CREDIT CARD INTEREST	0.00	0	f	2026-07-25 06:58:23.988409	2026-07-25 06:58:23.988409
\.


--
-- Data for Name: service_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_categories (id, code, label, sort_order, active, is_variable_amount, created_at, updated_at) FROM stdin;
1	OPD	OPD	1	t	f	2026-07-15 11:35:02.440895	2026-07-15 11:36:36.189
7	MINOR_INCOME	MINOR INCOME	7	t	f	2026-07-15 11:46:30.030172	2026-07-15 11:46:30.030172
4	SATYAM	Satyam	4	t	f	2026-07-15 11:37:31.642815	2026-07-15 11:46:43.485
3	IVF	IVF	3	t	f	2026-07-15 11:37:07.216738	2026-07-15 11:46:58.491
9	STAFF	STAFF	9	f	f	2026-07-17 08:58:25.964068	2026-07-17 09:00:58.178
6	DENTAL	DENTAL	2	t	f	2026-07-15 11:42:33.088241	2026-07-18 10:54:25.729
10	RECHARGE	Recharge	10	f	f	2026-07-17 09:47:40.741209	2026-07-18 10:55:20.091
8	OUTSOURCING	OUTSOURCING	5	t	f	2026-07-15 11:48:04.005795	2026-07-18 10:55:55.302
5	PHARMACY	PHARMACY	8	t	f	2026-07-15 11:38:01.826067	2026-07-18 10:56:10.43
2	IPD	IPD	9	t	f	2026-07-15 11:35:50.202767	2026-07-18 10:56:22.615
11	CASH_RETURN	CASH RETURN	11	t	f	2026-07-20 10:45:44.933466	2026-07-20 10:45:44.933466
12	IMMUNIZATION(NICU)	IMMUNIZATION (NICU)	12	t	f	2026-07-20 11:34:18.780615	2026-07-20 11:34:18.780615
13	OTHER_INCOME	OTHER INCOME	13	t	f	2026-07-25 06:57:47.466081	2026-07-25 06:57:47.466081
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session (id, "expiresAt", token, "ipAddress", "userAgent", "userId", "impersonatedBy", "createdAt", "updatedAt") FROM stdin;
HgmjeKY9ifWwaVN3fmfFn8jQUpPGq77s	2026-07-22 04:55:41.369	aJRnRUMj1SAfUj3G3sNyBQA1KTYBd0K6		Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	\N	2026-07-15 04:55:41.369	2026-07-15 04:55:41.369
XrjdXK7aSHfoG4w18fi0xuW228umuhJE	2026-07-22 11:21:31.765	wLd3wfdQGsXVCgIwoLS7UKAXB1Ts8oUS		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	\N	2026-07-15 11:21:31.765	2026-07-15 11:21:31.765
AkjsASWqGWDmSvwCQFoo2Bf1S93zRPcm	2026-07-23 07:58:41.861	nUkSv9mUpJCHPe5qeABo1iQf5R7mfCpY		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	\N	2026-07-16 07:58:41.861	2026-07-16 07:58:41.861
6dVduekWa5tXPrOCdwUzbyDMsx56OvGV	2026-07-30 10:26:51.818	iCnHt05FyIEwOeNFK8InvTz4dXbjjYKN		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	\N	2026-07-16 06:33:49.319	2026-07-23 10:26:51.818
TFfA3uhlyTSa2m8LlyiViZifthK1IPtN	2026-07-30 12:33:56.149	9LTXz0nVPsfjJhtNDVNMo1XSkTCJfuHX		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-07-23 12:33:56.149	2026-07-23 12:33:56.149
ZCEKW7Q4VsztrKUnNpNxdIsDfc107WH9	2026-08-01 05:37:11.568	2tAb6sastYqhJBDvv3tTMJluQ168FVgH		Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-07-25 05:37:11.568	2026-07-25 05:37:11.568
Jx480zQaOuiV4BhTTeVcS0gEA3WkFj6l	2026-08-01 05:40:00.084	7bnz0U0Wn5vqrgb9xJKJ4nfY6p45xZyO		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	\N	2026-07-25 05:40:00.084	2026-07-25 05:40:00.084
xWAWPacg0rl1Rn3s6kXZStxJSiIMJ47r	2026-08-01 05:48:54.729	TH9WjH0qjR76izulR9RL9aTmmnbvBjkP		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-07-25 05:48:54.73	2026-07-25 05:48:54.73
BamwnoCZtHeMqyWdD0kPHJBuHX9jUGAz	2026-08-03 11:09:16.947	phvo07qMqYYg0pmvEy3s5VHZWQvF2S1D		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-07-27 11:09:16.947	2026-07-27 11:09:16.947
8eaFfhJxOR4RJwn3OMRrpOgjt0tZVN4W	2026-07-26 07:16:57.4	Zexeip4MTWQBz3FTP5QZWCZyjhroxjpm		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	\N	2026-07-15 11:16:43.783	2026-07-19 07:16:57.4
Ynmbj8KqVY1QBNebpKg8DoNl1QCwfgfH	2026-07-30 06:18:24.504	XXHyuQbBpWBnZKcMo8anYERNVn91vYO9			4jkPcSiE1XLo8XjDPon3LlNzhvgC5cls	\N	2026-07-23 06:18:24.504	2026-07-23 06:18:24.504
d8OzQPJhvoUd8fOroZAf78oo08MlylcX	2026-07-30 07:17:42.584	ce1JescDVMukzNapGZp6G4OvBSY8LYW7		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-07-23 07:17:42.585	2026-07-23 07:17:42.585
\.


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shifts (id, name, code, start_time, end_time, active, is_off_day, sort_order, created_at, updated_at) FROM stdin;
1	Leave	LV	00:00	23:59	t	t	0	2026-07-14 09:14:46.79396	2026-07-14 09:14:46.79396
2	Morning	M	07:00	12:30	t	f	0	2026-07-14 09:14:46.79396	2026-07-14 09:14:46.79396
3	Evening	E	12:00	18:00	t	f	0	2026-07-14 09:14:46.79396	2026-07-14 09:14:46.79396
4	Night	N	17:30	07:00	t	f	0	2026-07-14 09:14:46.79396	2026-07-14 09:14:46.79396
5	Half Day Leave	HDLV	13:00	17:00	t	f	0	2026-07-14 09:14:46.79396	2026-07-14 09:14:46.79396
7	Day Evening	DE	10:00	18:00	t	f	0	2026-07-15 05:39:50.588678	2026-07-15 05:39:50.588678
8	Day	D	08:00	16:00	t	f	0	2026-07-15 05:40:54.42822	2026-07-15 05:40:54.42822
6	Day Morning 	DM	09:00	17:00	t	f	0	2026-07-15 05:38:48.535499	2026-07-15 05:38:48.535499
\.


--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff (staff_id, employee_code, name, role, phone, email, salary, status, aadhar, pan, version, active, user_id, is_executive, created_at, updated_at) FROM stdin;
8	EMP-ZK5CQ	Keisham Cheengwang	Executive Marketing & BD	8787539494	kcwang.keisham@gamil.com	1.00	Active	549295947591	BEDPC0738P	1	f	\N	f	2026-07-16 06:25:55.52746	2026-07-16 06:25:55.52746
1	EMP-2KPFU	Ningthoujam Ronita Devi	HR Executive	9436637514	ningthoujamronita3876@gmail.com	1.00	Active	646410700197	CHCPD5846E	1	f	\N	f	2026-07-14 10:36:30.026557	2026-07-14 10:36:30.026557
8	EMP-ZK5CQ	Keisham Cheengwang	Executive Marketing & BD	8787539494	kcwang.keisham@gamil.com	0.00	Active	549295947591	BEDPC0738P	2	t	\N	f	2026-07-16 06:26:37.264681	2026-07-16 06:26:37.264681
9	EMP-6C5SE	Robertsun Elangbam	Assistant Manager 	7005402261	robertsunelangbam2012@gmail.com	1.00	Active	820738289397	BYEPR8924H	1	t	\N	f	2026-07-16 07:07:30.322619	2026-07-16 07:07:30.322619
1	EMP-2KPFU	Ningthoujam Ronita Devi	HR Executive	9436637514	ningthoujamronita3786@gmail.com	0.00	Active	646410700197	CHCPD5846E	2	t	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	f	2026-07-14 11:09:06.573095	2026-07-14 11:09:06.573095
19	EMP-JCUB7	Sonia Hanglem	Nursing officer 	9436015537	soniahanglem@gmail.com	1.00	Active	293031314773	APGPH9626E	1	f	\N	f	2026-07-18 06:00:00.939888	2026-07-18 06:00:00.939888
11	EMP-HLUHR	Priyanka Laishram	Pharmacist 	8731011232	priyankalaishram2002@gmail.com	1.00	Active	838720007259	BPUPL2052P	1	f	1Dv121z8xdadYrlt8gVSvuFytyzP7KGH	f	2026-07-16 11:57:21.516579	2026-07-16 11:57:21.516579
5	EMP-13VHJ	Khundrakpam Memtombi Devi	Account Assistant	7005249530	echanthoibi69992@gmail.com	1.00	Active	801277513454	CPNPD4092K	1	f	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	f	2026-07-14 11:46:04.77893	2026-07-14 11:46:04.77893
5	EMP-13VHJ	Khundrakpam Memtombi Devi	Account Assistant	7005249530	echanthoibi69992@gmail.com	0.00	Active	801277513454	CPNPD4092K	2	f	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	f	2026-07-15 05:50:51.299328	2026-07-15 05:50:51.299328
5	EMP-13VHJ	Khundrakpam Memtombi Devi	Account Assistant	7005249530	echanthoibi69992@gmail.com	0.00	Active	801277513454	CPNPD4092K	3	t	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	f	2026-07-15 05:55:52.791184	2026-07-15 05:55:52.791184
11	EMP-HLUHR	Priyanka Laishram	Pharmacist 	8731011232	priyankalaishram2002@gmail.com	0.00	Active	838720007259	BPUPL2052P	2	t	1Dv121z8xdadYrlt8gVSvuFytyzP7KGH	f	2026-07-16 11:59:55.343507	2026-07-16 11:59:55.343507
3	EMP-9K0EV	Maibam Romita Devi	Account Assistant	8257984480	mromita1993@gmail.com	1.00	Active	475462791788	BNAPD7027E	1	f	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	f	2026-07-14 11:29:35.578549	2026-07-14 11:29:35.578549
3	EMP-9K0EV	Maibam Romita Devi	Account Assistant	8257984480	mromita1993@gmail.com	0.00	Active	475462791788	BNAPD7027E	2	t	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	f	2026-07-15 06:04:12.270202	2026-07-15 06:04:12.270202
4	EMP-270OQ	Keithellakpam Sonilata Devi	Account Assistant	9612275202	keithellakpamsanny@gmail.com	1.00	Active	931563576867	BQYPD8354F	1	f	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	f	2026-07-14 11:42:03.230243	2026-07-14 11:42:03.230243
4	EMP-270OQ	Keithellakpam Sonilata Devi	Account Assistant	9612275202	keithellakpamsanny@gmail.com	0.00	Active	931563576867	BQYPD8354F	2	f	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	f	2026-07-15 06:01:58.403351	2026-07-15 06:01:58.403351
4	EMP-270OQ	Keithellakpam Sonilata Devi	Account Assistant	9612275202	keithellakpamsanny@gmail.com	0.00	Active	931563576867	BQYPD8354F	3	t	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	f	2026-07-15 06:24:45.569175	2026-07-15 06:24:45.569175
2	EMP-QK7O7	Ngangkham Tarunkumar Singh	Assistant Manager 	7005854401	tarunng12@gmail.com	1.00	Active	954721737049	EQAPS3786R	1	f	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	f	2026-07-14 11:05:10.015602	2026-07-14 11:05:10.015602
2	EMP-QK7O7	Ngangkham Tarunkumar Singh	Assistant Manager 	7005854401	tarunng12@gmail.com	0.00	Active	954721737049	EQAPS3786R	2	t	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	f	2026-07-15 06:28:17.37521	2026-07-15 06:28:17.37521
6	EMP-CRHPY	Pinky Laishram	Nursing Superintendent 	8257804254	pinkylaishram333@gmail.com	1.00	Active	593337299532	AKXPL9016C	1	f	\N	f	2026-07-15 06:52:32.191929	2026-07-15 06:52:32.191929
6	EMP-CRHPY	Pinky Laishram	INFECTION CONTROL NURSE	8257804254	pinkylaishram333@gmail.com	0.00	Active	593337299532	AKXPL9016C	2	t	\N	f	2026-07-16 04:30:14.843811	2026-07-16 04:30:14.843811
7	EMP-QK8B6	Thounaojam Sorojini Chanu	Nursing Supervisor 	8415962874	sorojini.83@gmail.com	1.00	Active	427426607628	BWVPD0321F	1	f	\N	f	2026-07-16 04:43:58.255192	2026-07-16 04:43:58.255192
7	EMP-QK8B6	Thounaojam Sorojini Chanu	Nursing Supervisor 	8415962874	sorojini.83@gmail.com	0.00	Active	427426607628	BWVPD0321F	2	t	\N	f	2026-07-16 06:06:13.143199	2026-07-16 06:06:13.143199
10	EMP-032LN	Akoijam Maheshwor Singh	Assistant Manager 	7005872709	maheshwor2014singh@gamil.com	1.00	Active	362923539794	JRCPS5557Q	1	f	Ka7zRdnBC1l9KZ271rUof2l6QWVrB1Zb	f	2026-07-16 09:32:45.651303	2026-07-16 09:32:45.651303
10	EMP-032LN	Akoijam Maheshwor Singh	Assistant Manager 	7005872709	maheshwor2014singh@gamil.com	0.00	Active	362923539794	JRCPS5557Q	2	t	Ka7zRdnBC1l9KZ271rUof2l6QWVrB1Zb	f	2026-07-16 12:03:39.76785	2026-07-16 12:03:39.76785
12	EMP-53IYC	Sougrakpam Sushillo Singh	Assistant General Manager 	7005104132	sushillosougrakpam97@gmail.com	1.00	Active	471786544280	GEPPS0281N	1	t	\N	f	2026-07-16 12:37:30.415303	2026-07-16 12:37:30.415303
13	EMP-EQ8PY	Laiphrakpam Karuna	Operations Executive 	9612466556	karyaslaiphrakpam@gmail.com	1.00	Active	676242809622	BTDPD3793G	1	t	\N	f	2026-07-17 05:20:49.860794	2026-07-17 05:20:49.860794
14	EMP-LIGKH	Guruaribam Rohit Kumar Sharma	Manager	7005237641	g.rohitkrs@gmail.com	1.00	Active	727868950307	BQWPS0009L	1	t	\N	f	2026-07-17 06:57:51.009772	2026-07-17 06:57:51.009772
15	EMP-KIPUH	Bidyalaxmi Salam	Nursing officer 	8730032314	bidyalaxmisalam@gmail.com	1.00	Active	368399957697	OPWPS2965M	1	t	\N	f	2026-07-17 11:08:28.307406	2026-07-17 11:08:28.307406
16	EMP-YYA7U	Ningthoujam Dhanapyari	Incharge 	9612097828	dhana.006@gmail.com	1.00	Active	219029972189	CGZPD1165J	1	t	\N	f	2026-07-17 11:38:08.005618	2026-07-17 11:38:08.005618
17	EMP-Q42SJ	Beishamayum Niliza Devi	Nursing Incharge 	8416095747	nilizaatom@gmail.com	1.00	Active	375200405639	DMRPD9236F	1	t	\N	f	2026-07-18 05:11:12.591143	2026-07-18 05:11:12.591143
18	EMP-4PKDP	Kabrambam Yukiko	Nursing officer 	8732010705	kabrambamyukiko@gmail.com	1.00	Active	365572200124	AKKPY4093R	1	f	\N	f	2026-07-18 05:35:35.606002	2026-07-18 05:35:35.606002
18	EMP-4PKDP	Kabrambam Yukiko	Nursing officer 	8732010705	kabrambamyukiko@gmail.com	0.00	Active	365572200124	AKKPY4093R	2	t	\N	f	2026-07-18 05:37:24.260785	2026-07-18 05:37:24.260785
19	EMP-JCUB7	Sonia Hanglem	Nursing officer 	9436015537	soniahanglem@gmail.com	0.00	Active	293031314773	APGPH9626E	2	t	\N	f	2026-07-18 06:04:03.806427	2026-07-18 06:04:03.806427
20	EMP-WRTWU	Pukhrambam Niranjala Devi	Nursing officer 	7628015260	teddypuk1234@gmail.com	1.00	Active	764896765128	EHGPD3054N	1	f	\N	f	2026-07-18 07:05:49.980971	2026-07-18 07:05:49.980971
20	EMP-WRTWU	Pukhrambam Niranjala Devi	Nursing officer 	7628015260	teddypuk1234@gmail.com	0.00	Active	764896765128	EHGPD3054N	2	t	\N	f	2026-07-18 07:07:52.556097	2026-07-18 07:07:52.556097
21	EMP-LMP7U	Tourangbam Anita Devi	Incharge 	7005785249	ruhiniarambam242@gmail.com	1.00	Active	576179912805	CRJPD8645Q	1	t	\N	f	2026-07-18 08:46:25.054153	2026-07-18 08:46:25.054153
22	EMP-W6UIF	Mayengbam Chandrikamalini	Front  Office Executive	8132080329	mayengbamchandrika8@gmail.com	1.00	Active	600412676796	JKHPM0726F	1	t	\N	f	2026-07-18 09:00:30.491812	2026-07-18 09:00:30.491812
23	EMP-WAI36	Elangbam Tarunjit	Andrologist cum Trainee Embryologist 	9863980234	elangbamelle@gmail.com	1.00	Active	996835032557	BIPPT9956C	1	t	\N	f	2026-07-18 09:17:02.850688	2026-07-18 09:17:02.850688
24	EMP-EUYS8	Thokchom Linthoinganbi	Front  Office Executive	9366394727	linthoithokchom805@gmail.com	1.00	Active	869766332371	CJDPC3982K	1	t	\N	f	2026-07-18 11:05:01.680965	2026-07-18 11:05:01.680965
25	EMP-LJD34	Oinam Manju	Nursing officer 	8787450867	oinammanju5@gmail.com	1.00	Active	693489548546	FQIPD1490Q	1	t	\N	f	2026-07-18 11:12:50.925096	2026-07-18 11:12:50.925096
26	EMP-OSJLW	Brahmacharimayum Arsia	Front  Office Executive	8729887996	arsiasharma123@gmail.com	1.00	Active	340821674297	GJFPD9396L	1	t	\N	f	2026-07-18 11:20:48.694326	2026-07-18 11:20:48.694326
27	EMP-Q3LBV	Samjetsabam Babysana Devi	Nursing officer 	9014304259	babysanasamjet@gmail.com	1.00	Active	735347063558	GUIPD4076B	1	t	\N	f	2026-07-19 03:03:40.553404	2026-07-19 03:03:40.553404
28	EMP-ZDCDK	Phuritshabam Premlata Devi	Assistant Incharge	8787784137	phuritsabam23@gmail.com	1.00	Active	624382597669	BMJPD4580L	1	t	\N	f	2026-07-19 03:55:58.876678	2026-07-19 03:55:58.876678
29	EMP-COCRH	Maibam Sanatombi Chanu	Incharge 	9862546767	maibamsanatombi7@gmail.com	1.00	Active	831994562198	BORPC0931E	1	t	\N	f	2026-07-19 04:18:14.949662	2026-07-19 04:18:14.949662
30	EMP-ER0IR	Leitanthem Nanao Devi	Nursing officer 	8787682284	leitanthemnanao07@gmail.com	1.00	Active	994441204393	DNXPD9843M	1	t	\N	f	2026-07-19 05:29:06.982216	2026-07-19 05:29:06.982216
31	EMP-UOGFL	Chungkham Nikita	Nursing officer 	9862628346	chungkhamnikita73@gmail.com	1.00	Active	641282826593	DOCPN7312R	1	f	\N	f	2026-07-19 05:48:50.047716	2026-07-19 05:48:50.047716
31	EMP-UOGFL	Chungkham Nikita	Nursing officer 	9862628346	chungkhamnikita73@gmail.com	0.00	Active	641282826593	DOCPN7312R	2	t	\N	f	2026-07-19 05:52:20.666729	2026-07-19 05:52:20.666729
32	EMP-LJ2Z7	Narmada Khomdram	Nursing officer 	8837063259	narmadakhomdram@gmail.com	1.00	Active	989414096080	HXIPK8324K	1	t	\N	f	2026-07-19 07:37:13.683208	2026-07-19 07:37:13.683208
33	EMP-M578N	Heikrujam Sandhyarani Devi	Nursing officer 	7627937234	heikrujamsandhya123@gmail.com	1.00	Active	613781052931	JKMPD4602J	1	t	\N	f	2026-07-19 09:04:52.009738	2026-07-19 09:04:52.009738
34	EMP-N9E96	Jackie Laiphrakpam	Pharmacist 	7085186393	laiphrakpam76@gamil.com	1.00	Active	328186128626	AIZPL1383L	1	t	\N	f	2026-07-19 10:04:47.868798	2026-07-19 10:04:47.868798
35	EMP-M3783	Aribam Riya Sharma	Nursing officer 	8837217347	rjshria@gmail.com	1.00	Active	918974467506	GVJPS1107L	1	t	\N	f	2026-07-19 10:19:50.474492	2026-07-19 10:19:50.474492
36	EMP-YD47H	Menerajkini Yengkhom	RMO/Clinical Assistant 	7975286628	kiniyengkhom000@gmail.com	1.00	Active	393818444774	BEZPY5864C	1	t	\N	f	2026-07-19 10:51:25.81081	2026-07-19 10:51:25.81081
37	EMP-28BMH	Nanaobi Waikhom	RMO/Clinical Assistant 	8837289371	nanaobiwaikhom29@gmail.com	1.00	Active	843350439290	AEWPW0657B	1	t	\N	f	2026-07-19 11:01:25.598219	2026-07-19 11:01:25.598219
38	EMP-YKIOC	Soram Amita Devi	RMO/Clinical Assistant 	8906134825	amitasoram36@gmail.com	1.00	Active	454454867737	DWIPD7916R	1	t	\N	f	2026-07-19 11:14:37.643987	2026-07-19 11:14:37.643987
39	EMP-A2LAC	Shamanduram Shunanda Devi	RMO/Clinical Assistant 	9366270729	shunanda14@gmail.com	1.00	Active	681659508571	CQPPD8049B	1	t	\N	f	2026-07-19 11:32:00.085632	2026-07-19 11:32:00.085632
40	EMP-C1T7W	Khangembam Khamlangba Singh	X-Ray Technician	8787540877	khamlangba.kh@gmail.com	1.00	Active	718009768471	EHNPS3684A	1	t	\N	f	2026-07-19 11:51:01.251134	2026-07-19 11:51:01.251134
41	EMP-M0QSA	Thiyam Priya	RMO/Clinical Assistant 	6297687049	thiyampriya99@gmail.com	1.00	Active	266077966510	HVGPY8625B	1	f	\N	f	2026-07-19 11:58:06.157213	2026-07-19 11:58:06.157213
41	EMP-M0QSA	Thiyam Priya	RMO/Clinical Assistant 	6297687049	thiyampriya99@gmail.com	0.00	Active	266077966510	ENMPP9647D	2	t	\N	f	2026-07-19 12:02:01.824128	2026-07-19 12:02:01.824128
42	EMP-FQPPO	Takhenchangbam Jhansirani	Assistant Lab. Director	7005245493	janemariachinglun@gmail.com	1.00	Active	787567013619	EFSPD3288A	1	f	\N	f	2026-07-21 02:35:28.597768	2026-07-21 02:35:28.597768
42	EMP-FQPPO	Takhenchangbam Jhansirani	Assistant Lab. Director	7005245493	janemariachinglun@gmail.com	0.00	Active	787567013619	EFSPD3288A	2	t	\N	f	2026-07-21 02:37:06.080922	2026-07-21 02:37:06.080922
43	EMP-T4D95	Chandam Radharani Devi	Nursing officer 	7005569286	chandamradharani@gmail.com	1.00	Active	229766073595	FYNPD4476D	1	t	\N	f	2026-07-21 02:51:44.664726	2026-07-21 02:51:44.664726
44	EMP-33QUO	Yengkhom Amarjit Meitei	OT Technician 	8787438177	amarjityengkhom098@gmail.com	1.00	Active	636823373609	FVGPM8625B	1	t	\N	f	2026-07-21 03:15:52.863546	2026-07-21 03:15:52.863546
45	EMP-JGUYQ	Mayengbam Jayenti Devi	Nursing officer 	8414045750	mayengbamjayenti@gmail.com	1.00	Active	680506660085	HGKPD8419R	1	t	\N	f	2026-07-21 03:29:19.596781	2026-07-21 03:29:19.596781
46	EMP-NXFG0	Rajkumari Premika Chanu	Front  Office Executive	9233661253	rajkumaripremika2000@gamil.com	1.00	Active	254629369218	CUHPC6512J	1	t	\N	f	2026-07-21 03:40:06.171835	2026-07-21 03:40:06.171835
47	EMP-O34LM	Chongtham Melisha	Nursing officer 	8258905887	chanbiichongthamchanbi65@gamil.com	1.00	Active	917525538409	DNDPD6009R	1	t	\N	f	2026-07-21 03:53:54.559979	2026-07-21 03:53:54.559979
48	EMP-LZ46I	Moirangthem Puinapati Devi	Nursing officer 	8258892802	moirangthempuinapati@gmail.com	1.00	Active	576369210188	GIVPD2064J	1	t	\N	f	2026-07-21 05:03:31.258648	2026-07-21 05:03:31.258648
49	EMP-KDZNF	Priyaluxmi Tongbram	Nursing officer 	8413938907	priyaluxmitongbram35532@gmail.com	1.00	Active	871865899952	BFLPT3265B	1	t	\N	f	2026-07-21 05:40:54.717157	2026-07-21 05:40:54.717157
50	EMP-7E6TX	Thanglendanla Dina Chiru	OT Technician 	9612784637	dina12thanglen@gmail.com	1.00	Active	892520116107	CETPC2018F	1	t	\N	f	2026-07-21 05:53:40.899838	2026-07-21 05:53:40.899838
51	EMP-5CKI6	Oinam Sapana Devi	Nursing officer 	8257834707	sapanaoinamthoi@gmail.com	1.00	Active	576745477103	EPTPD4147D	1	t	\N	f	2026-07-21 06:13:52.127803	2026-07-21 06:13:52.127803
52	EMP-6UOH7	Kangjam Sangeeta Devi 	Nursing Incharge 	8794239560	sangeetapibaren@gmail.com	1.00	Active	373978207623	CPCPD9253F	1	t	\N	f	2026-07-21 06:36:26.2629	2026-07-21 06:36:26.2629
53	EMP-WY7IW	Derick Yambem 	OT Technician 	9863982809	derickyambem123@gmail.com	1.00	Active	308283139501	BGHPY3933L	1	t	\N	f	2026-07-21 10:05:42.056346	2026-07-21 10:05:42.056346
54	EMP-PCX3X	Pukhrambam Anju Devi	Front  Office Executive	7005768543	anjupukhrambamnew@gmail.com	1.00	Active	794463561196	GHUPP3602J	1	t	\N	f	2026-07-21 10:17:04.88254	2026-07-21 10:17:04.88254
55	EMP-5KW6J	Angom Priyakumari	Incharge 	8131826941	angompriyakumari464@gmail.com	1.00	Active	353612574628	EAKPK7706R	1	t	\N	f	2026-07-21 10:42:29.911763	2026-07-21 10:42:29.911763
56	EMP-STP23	Aheibam Lamnganbi Chanu	Front  Office Executive	8798022829	aheibamchanu@gmail.com	1.00	Active	574142970893	CSPPC5706A	1	t	\N	f	2026-07-21 10:53:55.252064	2026-07-21 10:53:55.252064
57	EMP-IJ8U7	Subhashchandra Konjengbam	General Manager 	9089383109	subhashck@gmail.com	1.00	Active	577195221227	APGPK0883A	1	t	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	f	2026-07-22 10:37:49.358996	2026-07-22 10:37:49.358996
\.


--
-- Data for Name: staff_departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff_departments (id, staff_id, staff_version, department_id, version, status, changed_by_id, changed_by_name, changed_at, created_at, updated_at) FROM stdin;
1	1	1	17	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-14 10:36:30.117436	2026-07-14 10:36:30.117436	2026-07-14 10:36:30.117436
3	1	2	17	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-14 11:09:06.597769	2026-07-14 11:09:06.597769	2026-07-14 11:09:06.597769
4	3	1	6	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-07-14 11:29:35.675627	2026-07-14 11:29:35.675627	2026-07-14 11:29:35.675627
5	4	1	6	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-07-14 11:42:03.346946	2026-07-14 11:42:03.346946	2026-07-14 11:42:03.346946
6	5	1	6	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-07-14 11:46:04.836643	2026-07-14 11:46:04.836643	2026-07-14 11:46:04.836643
39	5	2	6	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-15 05:50:51.397297	2026-07-15 05:50:51.397297	2026-07-15 05:50:51.397297
40	5	3	6	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-15 05:55:52.8308	2026-07-15 05:55:52.8308	2026-07-15 05:55:52.8308
41	4	2	6	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-15 06:01:58.430227	2026-07-15 06:01:58.430227	2026-07-15 06:01:58.430227
42	3	2	6	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-15 06:04:12.285498	2026-07-15 06:04:12.285498	2026-07-15 06:04:12.285498
43	4	3	6	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-15 06:24:45.603722	2026-07-15 06:24:45.603722	2026-07-15 06:24:45.603722
44	2	2	6	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-15 06:28:17.400963	2026-07-15 06:28:17.400963	2026-07-15 06:28:17.400963
45	6	1	2	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-15 06:52:32.241858	2026-07-15 06:52:32.241858	2026-07-15 06:52:32.241858
46	6	2	2	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-16 04:30:14.868384	2026-07-16 04:30:14.868384	2026-07-16 04:30:14.868384
47	7	1	21	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-16 04:43:58.300617	2026-07-16 04:43:58.300617	2026-07-16 04:43:58.300617
48	7	2	21	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-16 06:06:13.168998	2026-07-16 06:06:13.168998	2026-07-16 06:06:13.168998
49	8	1	2	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-16 06:25:55.573001	2026-07-16 06:25:55.573001	2026-07-16 06:25:55.573001
50	8	2	2	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-16 06:26:37.279054	2026-07-16 06:26:37.279054	2026-07-16 06:26:37.279054
51	9	1	2	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-16 07:07:30.365329	2026-07-16 07:07:30.365329	2026-07-16 07:07:30.365329
52	10	1	1	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-16 09:32:45.713486	2026-07-16 09:32:45.713486	2026-07-16 09:32:45.713486
53	11	1	11	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-16 11:57:21.640871	2026-07-16 11:57:21.640871	2026-07-16 11:57:21.640871
54	11	2	11	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-16 11:59:55.385375	2026-07-16 11:59:55.385375	2026-07-16 11:59:55.385375
55	10	2	1	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-16 12:03:39.797758	2026-07-16 12:03:39.797758	2026-07-16 12:03:39.797758
56	12	1	2	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-16 12:37:30.459171	2026-07-16 12:37:30.459171	2026-07-16 12:37:30.459171
57	13	1	1	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-17 05:20:49.954611	2026-07-17 05:20:49.954611	2026-07-17 05:20:49.954611
58	14	1	17	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-17 06:57:51.06674	2026-07-17 06:57:51.06674	2026-07-17 06:57:51.06674
59	15	1	19	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-17 11:08:28.351293	2026-07-17 11:08:28.351293	2026-07-17 11:08:28.351293
60	16	1	19	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-17 11:38:08.075105	2026-07-17 11:38:08.075105	2026-07-17 11:38:08.075105
61	17	1	3	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-18 05:11:12.634446	2026-07-18 05:11:12.634446	2026-07-18 05:11:12.634446
62	18	1	19	1	Inactive	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-18 05:35:35.662959	2026-07-18 05:35:35.662959	2026-07-18 05:35:35.662959
63	18	2	22	2	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-18 05:37:24.320945	2026-07-18 05:37:24.320945	2026-07-18 05:37:24.320945
64	19	1	3	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-18 06:00:00.973546	2026-07-18 06:00:00.973546	2026-07-18 06:00:00.973546
65	19	2	3	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-18 06:04:03.843049	2026-07-18 06:04:03.843049	2026-07-18 06:04:03.843049
66	20	1	19	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-18 07:05:50.075507	2026-07-18 07:05:50.075507	2026-07-18 07:05:50.075507
67	20	2	19	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-18 07:07:52.571935	2026-07-18 07:07:52.571935	2026-07-18 07:07:52.571935
68	21	1	20	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-18 08:46:25.086377	2026-07-18 08:46:25.086377	2026-07-18 08:46:25.086377
69	22	1	7	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-18 09:00:30.560475	2026-07-18 09:00:30.560475	2026-07-18 09:00:30.560475
70	23	1	15	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-18 09:17:02.913899	2026-07-18 09:17:02.913899	2026-07-18 09:17:02.913899
71	24	1	3	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-18 11:05:01.716944	2026-07-18 11:05:01.716944	2026-07-18 11:05:01.716944
72	25	1	19	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-18 11:12:50.972111	2026-07-18 11:12:50.972111	2026-07-18 11:12:50.972111
73	26	1	7	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-18 11:20:48.795546	2026-07-18 11:20:48.795546	2026-07-18 11:20:48.795546
74	27	1	19	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 03:03:40.652277	2026-07-19 03:03:40.652277	2026-07-19 03:03:40.652277
75	28	1	8	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 03:55:58.908167	2026-07-19 03:55:58.908167	2026-07-19 03:55:58.908167
76	29	1	8	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 04:18:14.97514	2026-07-19 04:18:14.97514	2026-07-19 04:18:14.97514
77	30	1	8	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 05:29:07.047501	2026-07-19 05:29:07.047501	2026-07-19 05:29:07.047501
78	31	1	8	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 05:48:50.096793	2026-07-19 05:48:50.096793	2026-07-19 05:48:50.096793
79	31	2	8	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 05:52:20.682598	2026-07-19 05:52:20.682598	2026-07-19 05:52:20.682598
80	32	1	8	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 07:37:13.723769	2026-07-19 07:37:13.723769	2026-07-19 07:37:13.723769
81	33	1	8	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 09:04:52.052881	2026-07-19 09:04:52.052881	2026-07-19 09:04:52.052881
82	34	1	11	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 10:04:47.923933	2026-07-19 10:04:47.923933	2026-07-19 10:04:47.923933
83	35	1	8	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 10:19:50.503912	2026-07-19 10:19:50.503912	2026-07-19 10:19:50.503912
84	36	1	13	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 10:51:25.866004	2026-07-19 10:51:25.866004	2026-07-19 10:51:25.866004
85	37	1	13	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 11:01:25.651204	2026-07-19 11:01:25.651204	2026-07-19 11:01:25.651204
86	38	1	13	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 11:14:37.672167	2026-07-19 11:14:37.672167	2026-07-19 11:14:37.672167
87	39	1	13	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 11:32:00.151204	2026-07-19 11:32:00.151204	2026-07-19 11:32:00.151204
88	40	1	14	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 11:51:01.284405	2026-07-19 11:51:01.284405	2026-07-19 11:51:01.284405
89	41	1	13	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 11:58:06.192819	2026-07-19 11:58:06.192819	2026-07-19 11:58:06.192819
90	41	2	13	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-19 12:02:01.858325	2026-07-19 12:02:01.858325	2026-07-19 12:02:01.858325
91	42	1	15	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 02:35:28.725358	2026-07-21 02:35:28.725358	2026-07-21 02:35:28.725358
92	42	2	15	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 02:37:06.096492	2026-07-21 02:37:06.096492	2026-07-21 02:37:06.096492
93	43	1	20	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 02:51:44.770879	2026-07-21 02:51:44.770879	2026-07-21 02:51:44.770879
94	44	1	19	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 03:15:52.964499	2026-07-21 03:15:52.964499	2026-07-21 03:15:52.964499
95	45	1	20	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 03:29:19.657496	2026-07-21 03:29:19.657496	2026-07-21 03:29:19.657496
96	46	1	7	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 03:40:06.226578	2026-07-21 03:40:06.226578	2026-07-21 03:40:06.226578
97	47	1	15	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 03:53:54.621142	2026-07-21 03:53:54.621142	2026-07-21 03:53:54.621142
98	48	1	19	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 05:03:31.342113	2026-07-21 05:03:31.342113	2026-07-21 05:03:31.342113
99	49	1	15	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 05:40:54.800813	2026-07-21 05:40:54.800813	2026-07-21 05:40:54.800813
100	50	1	19	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 05:53:40.946643	2026-07-21 05:53:40.946643	2026-07-21 05:53:40.946643
101	51	1	15	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 06:13:52.222388	2026-07-21 06:13:52.222388	2026-07-21 06:13:52.222388
102	52	1	15	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 06:36:26.333446	2026-07-21 06:36:26.333446	2026-07-21 06:36:26.333446
103	53	1	19	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 10:05:42.086484	2026-07-21 10:05:42.086484	2026-07-21 10:05:42.086484
104	54	1	7	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 10:17:04.985742	2026-07-21 10:17:04.985742	2026-07-21 10:17:04.985742
105	55	1	7	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 10:42:29.989146	2026-07-21 10:42:29.989146	2026-07-21 10:42:29.989146
106	56	1	7	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 10:53:55.375489	2026-07-21 10:53:55.375489	2026-07-21 10:53:55.375489
107	57	1	2	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-22 10:37:49.382897	2026-07-22 10:37:49.382897	2026-07-22 10:37:49.382897
2	2	1	6	1	Active	\N	Ningthoujam Ronita Devi	2026-07-14 11:05:10.050835	2026-07-14 11:05:10.050835	2026-07-14 11:05:10.050835
\.


--
-- Data for Name: staff_hr_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff_hr_profiles (id, staff_id, staff_version, date_of_birth, gender, marital_status, blood_group, father_name, mother_name, spouse_name, emergency_contact_name, emergency_contact_phone, current_address, permanent_address, education_history, professional_history, uan, epf_number, esi_number, date_of_joining, last_working_date, religion, nominees, mnc_registration_no, mnc_validity_upto, mmc_registration_no, mmc_validity_upto, created_at, updated_at) FROM stdin;
1	1	1	\N	Female	Single	\N	Late. Ningthoujam Bahadur Singh	Ningthoujam Thaba Devi		\N	\N	Kongpal Chanam Leikai	Kongpal Chanam Leikai	[]	[]	\N					Hinduism	[]					2026-07-14 10:36:30.135313	2026-07-14 10:36:30.135313
2	2	1	\N	Male	Married	\N	Ngangkham Jugeshwor Singh	Ngangkham Shanti Devi		\N	\N	Khurai Konsam Leikai, Imphal East Manipur-795010	Khurai Konsam Leikai, Imphal East Manipur-795010	[{"qualification":"Bcom","institution":"DM College","year":"2011","grade":"Passed"},{"qualification":"Certified Professional Computer Accountant","institution":"National Institute of Finance and Accounts","year":"2013","grade":"A+"},{"qualification":"DCA","institution":"Computer Training Institute","year":"2005","grade":"Grade B"}]	[{"employer":"Babina Hospitalities Pvt. Ltd.","designation":"Senior Asst. Accountant","from":"","to":"","responsibilities":""},{"employer":"Sky Hospital & Research Centre Pvt. Ltd","designation":"Accountant","from":"","to":"","responsibilities":""},{"employer":"Dhanni Hotels & Resorts Pvt. Ltd.","designation":"Account Manager","from":"","to":"","responsibilities":""}]	\N			2022-11-25		Hinduism	[]					2026-07-14 11:05:10.058114	2026-07-14 11:05:10.058114
3	1	2	\N	Female	Single	\N	Late. Ningthoujam Bahadur Singh	Ningthoujam Thaba Devi		\N	\N	Kongpal Chanam Leikai	Kongpal Chanam Leikai	[]	[]	\N			\N	\N	Hinduism	[]					2026-07-14 11:09:06.608708	2026-07-14 11:09:06.608708
4	3	1	\N	Female	Single	\N	Maibam Rohendro Singh	Maibam(O) Sabitri Devi		\N	\N	Khurai Chingangbam Leikai, Imphal East-795010	Khurai Chingangbam Leikai, Imphal East-795010	[{"qualification":"HSLC","institution":"Sacred Heart School","year":"2010","grade":"Third Division"},{"qualification":"HSSLC","institution":"Royal Academy Of Science, Wangkhei","year":"2012","grade":"First Division"},{"qualification":"Bsc. Botany Honours","institution":"Biramangol College","year":"2016","grade":"First Division"},{"qualification":"Tally Essential level I, II","institution":"Liklam Ventures Pvt. Ltd","year":"2024","grade":"Grade B"}]	[]	\N			2016-06-14		Hinduism	[]					2026-07-14 11:29:35.685243	2026-07-14 11:29:35.685243
5	4	1	\N	Female	Married	\N	Keithellakpam Nabakanta Singh	Keithellakpam(O) Bilashini Devi		\N	\N	Wangkhei Khunou, Old Checkon, Imphal East	Wangkhei Khunou, Old Checkon, Imphal East	[{"qualification":"HSLC","institution":"NIOS","year":"2005","grade":"Passed"},{"qualification":"SSCE","institution":"Hundred Flowers Hr. Sec School","year":"2007","grade":"Passed"},{"qualification":"BA","institution":"GP Women's College","year":"2010","grade":"Second division"},{"qualification":"MA","institution":"IGNOU","year":"","grade":"Passed"},{"qualification":"Tally Essential Level I, II","institution":"Liklam Ventures Pvt. Ltd","year":"2024","grade":"Grade B"}]	[]	\N			2013-11-20		Hinduism	[]					2026-07-14 11:42:03.363863	2026-07-14 11:42:03.363863
6	5	1	\N	Female	Married	\N	Khundrakpam Abhiram Singh	Khundrakpam(O) Yaima Devi		\N	\N	Sagolband, Imphal West-795001	Sagolband, Imphal West-795001	[]	[]	\N			2020-11-09		Hinduism	[]					2026-07-14 11:46:04.843649	2026-07-14 11:46:04.843649
39	5	2	\N	Female	Married	\N	Khundrakpam Abhiram Singh	Khundrakpam(O) Yaima Devi		\N	\N	Sagolband, Imphal West-795001	Sagolband, Imphal West-795001	[{"qualification":"HSLC","institution":"K.M Blooming English School, Khangabok","year":"2009","grade":"Second Division"},{"qualification":"HSSLC","institution":"Vision Creative School of Science Thoubal","year":"2011","grade":"First Division"},{"qualification":"BSc. Chemistry Honours","institution":"Kamakhya Pemton College","year":"2019","grade":"First Division"},{"qualification":"Advance Diploma in Financial Accounting","institution":"Swanirvar Charitable Trust, MSME","year":"2022","grade":"A Grade"},{"qualification":"D. Pharm","institution":"Tripura Board of Pharmacy Education","year":"2014","grade":"First Division"}]	[{"employer":"Smart Medicos(Salai)","designation":"Account Assistant","from":"2yrs","to":"","responsibilities":""}]	\N			\N	\N	Hinduism	[]					2026-07-15 05:50:51.426871	2026-07-15 05:50:51.426871
40	5	3	\N	Female	Married	\N	Khundrakpam Abhiram Singh	Khundrakpam(O) Yaima Devi		\N	\N	Sagolband, Imphal West-795001	Sagolband, Imphal West-795001	[{"qualification":"HSLC","institution":"K.M Blooming English School, Khangabok","year":"2009","grade":"Second Division"},{"qualification":"HSSLC","institution":"Vision Creative School of Science Thoubal","year":"2011","grade":"First Division"},{"qualification":"BSc. Chemistry Honours","institution":"Kamakhya Pemton College","year":"2019","grade":"First Division"},{"qualification":"Advance Diploma in Financial Accounting","institution":"Swanirvar Charitable Trust, MSME","year":"2022","grade":"A Grade"},{"qualification":"D. Pharm","institution":"Tripura Board of Pharmacy Education","year":"2014","grade":"First Division"}]	[{"employer":"Smart Medicos(Salai)","designation":"Account Assistant","from":"2yrs","to":"","responsibilities":""}]	\N			\N	\N	Hinduism	[]					2026-07-15 05:55:52.848594	2026-07-15 05:55:52.848594
41	4	2	\N	Female	Married	\N	Keithellakpam Nabakanta Singh	Keithellakpam(O) Bilashini Devi	Nongthombam Umarjit Singh	\N	\N	Wangkhei Khunou, Old Checkon, Imphal East	Wangkhei Khunou, Old Checkon, Imphal East	[{"qualification":"HSLC","institution":"NIOS","year":"2005","grade":"Passed"},{"qualification":"SSCE","institution":"Hundred Flowers Hr. Sec School","year":"2007","grade":"Passed"},{"qualification":"BA","institution":"GP Women's College","year":"2010","grade":"Second division"},{"qualification":"MA","institution":"IGNOU","year":"","grade":"Passed"},{"qualification":"Tally Essential Level I, II","institution":"Liklam Ventures Pvt. Ltd","year":"2024","grade":"Grade B"}]	[]	\N			\N	\N	Hinduism	[]					2026-07-15 06:01:58.460039	2026-07-15 06:01:58.460039
42	3	2	\N	Female	Single	\N	Maibam Rohendro Singh	Maibam(O) Sabitri Devi		\N	\N	Khurai Chingangbam Leikai, Imphal East-795010	Khurai Chingangbam Leikai, Imphal East-795010	[{"qualification":"HSLC","institution":"Sacred Heart School","year":"2010","grade":"Third Division"},{"qualification":"HSSLC","institution":"Royal Academy Of Science, Wangkhei","year":"2012","grade":"First Division"},{"qualification":"Bsc. Botany Honours","institution":"Biramangol College","year":"2016","grade":"First Division"},{"qualification":"Tally Essential level I, II","institution":"Liklam Ventures Pvt. Ltd","year":"2024","grade":"Grade B"}]	[]	\N			\N	\N	Hinduism	[]					2026-07-15 06:04:12.317602	2026-07-15 06:04:12.317602
43	4	3	\N	Female	Married	\N	Keithellakpam Nabakanta Singh	Keithellakpam(O) Bilashini Devi	Nongthombam Umarjit Singh	\N	\N	Wangkhei Khunou, Old Checkon, Imphal East	Wangkhei Khunou, Old Checkon, Imphal East	[{"qualification":"HSLC","institution":"NIOS","year":"2005","grade":"Passed"},{"qualification":"SSCE","institution":"Hundred Flowers Hr. Sec School","year":"2007","grade":"Passed"},{"qualification":"BA","institution":"GP Women's College","year":"2010","grade":"Second division"},{"qualification":"MA","institution":"IGNOU","year":"","grade":"Passed"},{"qualification":"Tally Essential Level I, II","institution":"Liklam Ventures Pvt. Ltd","year":"2024","grade":"Grade B"}]	[]	\N	100628737998	8200022633	\N	\N	Hinduism	[]					2026-07-15 06:24:45.636162	2026-07-15 06:24:45.636162
54	11	2	2003-02-02	Female	Single	\N	Laishram Ibotombi Singh	Laishram Nungshithoi		\N	\N	Keirao Bitra Makha Leikai, Imphal East -795008	Keirao Bitra Makha Leikai, Imphal East -795008	[{"qualification":"HSLC","institution":"Brighter Academy","year":"2018","grade":"74%"},{"qualification":"HSE","institution":"Comet School, Changangei","year":"2020","grade":"72.4%"},{"qualification":"D. Pharm","institution":"Govt. Polytechnic, Takyel ","year":"2022","grade":"80%"}]	[{"employer":"JNIMS","designation":"Apprentice","from":"3months","to":"","responsibilities":""},{"employer":"Trevi Hospital ","designation":"Pharmacist","from":"01/06/2023","to":"31/07/2024","responsibilities":""}]	\N			\N	\N	Hinduism	[]					2026-07-16 11:59:55.413988	2026-07-16 11:59:55.413988
44	2	2	\N	Male	Married	\N	Ngangkham Jugeshwor Singh	Ngangkham Shanti Devi	Naya Tongbram	\N	\N	Khurai Konsam Leikai, Imphal East Manipur-795010	Khurai Konsam Leikai, Imphal East Manipur-795010	[{"qualification":"Bcom","institution":"DM College","year":"2011","grade":"Passed"},{"qualification":"Certified Professional Computer Accountant","institution":"National Institute of Finance and Accounts","year":"2013","grade":"A+"},{"qualification":"DCA","institution":"Computer Training Institute","year":"2005","grade":"Grade B"}]	[{"employer":"Babina Hospitalities Pvt. Ltd.","designation":"Senior Asst. Accountant","from":"","to":"","responsibilities":""},{"employer":"Sky Hospital & Research Centre Pvt. Ltd","designation":"Accountant","from":"","to":"","responsibilities":""},{"employer":"Dhanni Hotels & Resorts Pvt. Ltd.","designation":"Account Manager","from":"","to":"","responsibilities":""}]	\N			\N	\N	Hinduism	[]					2026-07-15 06:28:17.440754	2026-07-15 06:28:17.440754
45	6	1	\N	Female	Single	\N	Laishram Ranjit Singh			\N	\N	Porompat Thawanthaba Leikai, Imphal East	Porompat Thawanthaba Leikai, Imphal East	[{"qualification":"X","institution":"NIOS","year":"2004","grade":"Passed"},{"qualification":"XII","institution":"NIOS","year":"2006","grade":"Passed"},{"qualification":"GNM","institution":"AECS Maaruti School of Nursing","year":"2011","grade":"Passed"}]	[]	\N			2013-12-11		Sanamahism	[]					2026-07-15 06:52:32.250253	2026-07-15 06:52:32.250253
46	6	2	1987-03-01	Female	Single	\N	Laishram Ranjit Singh	Naoshekpam Lata Devi		\N	\N	Porompat Thawanthaba Leikai, Imphal East	Porompat Thawanthaba Leikai, Imphal East	[{"qualification":"X","institution":"NIOS","year":"2004","grade":"Passed"},{"qualification":"XII","institution":"NIOS","year":"2006","grade":"Passed"},{"qualification":"GNM","institution":"AECS Maaruti School of Nursing","year":"2011","grade":"Passed"}]	[{"employer":"Gautam Hospital","designation":"Staff Nurse, Ward","from":"18/04/2011","to":"10/04/2012","responsibilities":""},{"employer":"Suba Hospital","designation":"Staff Nurse","from":"1yr","to":"","responsibilities":""}]	\N			\N	\N	Sanamahism	[]					2026-07-16 04:30:14.880177	2026-07-16 04:30:14.880177
47	7	1	1983-05-03	Female	Married	\N	Thounaojam Tarun Meetei	Thounaojam(o) Ranjita Devi	Thoudam Jingo	\N	\N	Singjamei Wangma Mongkhang Lambi	Singjamei Wangma Mongkhang Lambi	[{"qualification":"HSLC","institution":"Little Rose Hr. Sc. School","year":"2000","grade":"45%"},{"qualification":"HSSLC","institution":"Asem Arun Kumar Institute of Science & Technology","year":"2002","grade":"50%"},{"qualification":"GNM","institution":"Vijaya School of Nursing","year":"2005","grade":"72%"}]	[{"employer":"Rabindranath Tagore Institute of Cardiac Science","designation":"Staff Nurse, Ward","from":"29/08/2005","to":"27/01/2007","responsibilities":""},{"employer":"AMRI Hospital, Kolkata","designation":"Staff Nurse, NSITU","from":"02/02/2007","to":"11/06/2009","responsibilities":""}]	\N			2013-12-01		Sanamahism	[]					2026-07-16 04:43:58.314001	2026-07-16 04:43:58.314001
48	7	2	1983-05-03	Female	Married	\N	Thounaojam Tarun Meetei	Thounaojam(o) Ranjita Devi	Thoudam Jingo	\N	\N	Singjamei Wangma Mongkhang Lambi	Singjamei Wangma Mongkhang Lambi	[{"qualification":"HSLC","institution":"Little Rose Hr. Sc. School","year":"2000","grade":"45%"},{"qualification":"HSSLC","institution":"Asem Arun Kumar Institute of Science & Technology","year":"2002","grade":"50%"},{"qualification":"GNM","institution":"Vijaya School of Nursing","year":"2005","grade":"72%"}]	[{"employer":"Rabindranath Tagore Institute of Cardiac Science","designation":"Staff Nurse, Ward","from":"29/08/2005","to":"27/01/2007","responsibilities":""},{"employer":"AMRI Hospital, Kolkata","designation":"Staff Nurse, NSITU","from":"02/02/2007","to":"11/06/2009","responsibilities":""},{"employer":"Maroodyn(Oasis) & Research Centre","designation":"Staff Nurse. OT","from":"07/12/2009","to":"30/11/2013","responsibilities":""}]	\N			\N	\N	Sanamahism	[]					2026-07-16 06:06:13.181153	2026-07-16 06:06:13.181153
49	8	1	1994-07-15	Male	Single	\N	Keisham Nilakanta Singh	Keisham Ibempishak Devi		\N	\N	Khuyathong D.M College Colony	Khuyathong D.M College Colony	[{"qualification":"AISSE","institution":"R.K. Mission Vidyapith Deoghar, Jharkhand","year":"2012","grade":"9.2"},{"qualification":"BSc. Physics Honours","institution":"University of Delhi","year":"2017","grade":"59.1%"},{"qualification":"MA Public Administration","institution":"IGNOU","year":"2019","grade":"64.3%"},{"qualification":"DCA","institution":"Pointrex","year":"2023","grade":"S Grade"}]	[]	\N					Hinduism	[]					2026-07-16 06:25:55.581417	2026-07-16 06:25:55.581417
50	8	2	1994-07-15	Male	Single	\N	Keisham Nilakanta Singh	Keisham Ibempishak Devi		\N	\N	Khuyathong D.M College Colony	Khuyathong D.M College Colony	[{"qualification":"AISSE","institution":"R.K. Mission Vidyapith Deoghar, Jharkhand","year":"2012","grade":"9.2"},{"qualification":"BSc. Physics Honours","institution":"University of Delhi","year":"2017","grade":"59.1%"},{"qualification":"MA Public Administration","institution":"IGNOU","year":"2019","grade":"64.3%"},{"qualification":"DCA","institution":"Pointrex","year":"2023","grade":"S Grade"}]	[]	\N			\N	\N	Hinduism	[]					2026-07-16 06:26:37.298428	2026-07-16 06:26:37.298428
51	9	1	1991-03-28	Male	Married	\N	Late Elangbam Ranjit Singh	K. Sumatibala Devi	Khwairakpam Surjata Devi	\N	\N	Keishamthong Elangbam Leikai, Imphal East-795001	Keishamthong Elangbam Leikai, Imphal East-795001	[{"qualification":"HSLC","institution":"Don Bosco Langjing","year":"2006","grade":"54%"},{"qualification":"HSSLC","institution":"Bhaktivedanta Institute Mission School, Imphal","year":"2009","grade":"69%"},{"qualification":"BBA","institution":"Thanthai Hans Roever college. Tamilnadu","year":"2012","grade":"56%"},{"qualification":"MBA","institution":"Institute of professional Excellence & Management","year":"2014","grade":"58%"}]	[{"employer":"Pantaloons","designation":"Intern","from":"10/06/2013","to":"31/07/2013","responsibilities":""},{"employer":"WNS Global Services Pvt. Ltd","designation":"Associate Operator","from":"7Months","to":"","responsibilities":""},{"employer":"ICICI Prodential Life Insurance","designation":"","from":"","to":"","responsibilities":""}]	\N			2021-09-01		Hinduism	[]					2026-07-16 07:07:30.39217	2026-07-16 07:07:30.39217
52	10	1	1997-04-01	Male	Single	\N	Akoijam Mangi Singh	Akoijam(o) Bimola Devi		\N	\N	Thoubal Wangmataba Sorok Mathak, Thoubal-795138	Thoubal Wangmataba Sorok Mathak, Thoubal-795138	[{"qualification":"HSLC","institution":"Ruda Academy Thoubal","year":"2012","grade":"79.6%"},{"qualification":"HSSLC","institution":"Somorendra Sana Royal Higher Secondary School","year":"2014","grade":"87%"},{"qualification":"Bsc. OT Technology","institution":"Assam Down Town University","year":"2020","grade":"9.37CGPA"},{"qualification":"MBA in Healthcare","institution":"Assam Down Town Ubiversity","year":"2022","grade":"8.25CGPA"},{"qualification":"BSC. Zoology Honours","institution":"Thoubal College","year":"2017","grade":"62.5%"}]	[]	\N			2022-10-01		Hinduism	[]					2026-07-16 09:32:45.733033	2026-07-16 09:32:45.733033
53	11	1	2003-02-02	Female	Single	\N	Laishram Ibotombi Singh	Laishram Nungshithoi		\N	\N	Keirao Bitra Makha Leikai, Imphal East -795008	Keirao Bitra Makha Leikai, Imphal East -795008	[{"qualification":"HSLC","institution":"Brighter Academy","year":"2018","grade":"74%"},{"qualification":"HSE","institution":"Comet School, Changangei","year":"2020","grade":"72.4%"},{"qualification":"D. Pharm","institution":"Govt. Polytechnic, Takyel ","year":"2022","grade":"80%"}]	[{"employer":"JNIMS","designation":"Apprentice","from":"3months","to":"","responsibilities":""},{"employer":"Trevi Hospital ","designation":"Pharmacist","from":"01/06/2023","to":"31/07/2024","responsibilities":""}]	\N			2024-08-01		Hinduism	[]					2026-07-16 11:57:21.649959	2026-07-16 11:57:21.649959
55	10	2	1997-04-01	Male	Single	\N	Akoijam Mangi Singh	Akoijam(o) Bimola Devi		\N	\N	Thoubal Wangmataba Sorok Mathak, Thoubal-795138	Thoubal Wangmataba Sorok Mathak, Thoubal-795138	[{"qualification":"HSLC","institution":"Ruda Academy Thoubal","year":"2012","grade":"79.6%"},{"qualification":"HSSLC","institution":"Somorendra Sana Royal Higher Secondary School","year":"2014","grade":"87%"},{"qualification":"Bsc. OT Technology","institution":"Assam Down Town University","year":"2020","grade":"9.37CGPA"},{"qualification":"MBA in Healthcare","institution":"Assam Down Town Ubiversity","year":"2022","grade":"8.25CGPA"},{"qualification":"BSC. Zoology Honours","institution":"Thoubal College","year":"2017","grade":"62.5%"}]	[]	\N			\N	\N	Hinduism	[]					2026-07-16 12:03:39.806774	2026-07-16 12:03:39.806774
56	12	1	1991-02-01	Male	Single	\N	Sougrakpam Kuber Singh	Late. Sanasam Chandrakala Devi		\N	\N	Thoubal Awang Leikai, Thoubal-795138	Thoubal Awang Leikai, Thoubal-795138	[{"qualification":"MHA","institution":"Sikim Manipal University","year":"2017","grade":"A Grade"},{"qualification":"B.A","institution":"","year":"2015","grade":"Second Division"},{"qualification":"DOTT","institution":"Vedavyas Institute of Medical & Surgical Technology","year":"2011","grade":"First Division"},{"qualification":"SSE","institution":"Somarendra Sana Royal Hr. Sec. School","year":"2008","grade":"Second Division"},{"qualification":"HSLC","institution":"Anandapurna School, Thoubal","year":"2006","grade":"Second Division"}]	[{"employer":"Jivan Hospital , Kakching","designation":"Administrative","from":"10/08/2017","to":"19/10/2022","responsibilities":""},{"employer":"","designation":"","from":"","to":"","responsibilities":""}]	\N			2022-10-22		Hinduism	[]					2026-07-16 12:37:30.467579	2026-07-16 12:37:30.467579
57	13	1	1986-02-06	Female	Married	\N	Late Laiphrakpam Momon Singh	Thokchom Mema Devi	Oinam Yasowanta Meitei	\N	\N	Takyel Khongbal, Maning Leikai- Langjing Achouba , Imphal west-795113	Takyel Khongbal, Maning Leikai- Langjing Achouba , Imphal west-795113	[{"qualification":"HSLC","institution":"Irilbung High School","year":"2001","grade":"40%"},{"qualification":"HSE","institution":"Standard College","year":"2004","grade":"48%"},{"qualification":"GNM","institution":"SIMS Group of Institution(Vijaya)","year":"2007","grade":"72%"},{"qualification":"PB BSc. Nursing","institution":"Shirimanta Sangkar Deva University of Health Sciences","year":"2013","grade":"78%"}]	[{"employer":"Poona Hospital and Research Centre","designation":"Jr. Nursing Officer","from":"One Year","to":"","responsibilities":""},{"employer":"Imphal Hospital","designation":"Ward Junior Nursing","from":"One Year","to":"","responsibilities":""},{"employer":"Srimanta Sankardeva Hospital & Research","designation":"Ward In-Charge","from":"One Year","to":"","responsibilities":""}]	\N	100628934463	8200007070	2013-11-20		Sanamahism	[]	MNC: 1282	2025-03-31			2026-07-17 05:20:49.978831	2026-07-17 05:20:49.978831
58	14	1	1978-02-15	Male	Married	\N	Dr. G. Mahendra Kumar Sharma	N. Shantibala Devi	Yumnam Sanju	\N	\N	Khagempalli Pankha, Lane 1, Near Huidrom Leikai Lairembi, Imphal West-795001	Khagempalli Pankha, Lane 1, Near Huidrom Leikai Lairembi, Imphal West-795001	[{"qualification":"HSLC","institution":"St. Joseph's High School","year":"1994","grade":"57.83%"},{"qualification":"HSE","institution":"D.M College of Science","year":"1996","grade":"61.8%"},{"qualification":"TDC Botany Honours","institution":"D.M College of Science","year":"2000","grade":"66.33%"},{"qualification":"MBA, Marketing & Human Resources","institution":"Banglore University","year":"2005","grade":"56.50%"}]	[{"employer":"L. Kulabidhu Singh & CO. Godrej Dealer-FMCD","designation":"Asst. Manager. Sales","from":"8Months","to":"","responsibilities":""},{"employer":"Babina Diagnostics ","designation":"Assistant Manager Operations","from":"3Years 7Months","to":"","responsibilities":""},{"employer":"Helwlett Packard(HP) Enterprise","designation":"Bangalore University","from":"9 Year 4Months","to":"","responsibilities":""}]	\N			2022-10-01		Hinduism	[]					2026-07-17 06:57:51.087292	2026-07-17 06:57:51.087292
59	15	1	2004-03-27	Female	Single	\N	Salam Bimol Singh	Salam(O) Sunanda Devi		\N	\N	Wangkhei Angom Leikai Near Wal Club	Wangkhei Angom Leikai Near Wal Club	[{"qualification":"HSLC","institution":"Shishu Nistha Nikethan","year":"2019","grade":"First Division"},{"qualification":"HSE","institution":"Ananda Singh Higher Secondary","year":"2021","grade":"First Division"},{"qualification":"BSc. Nursing","institution":"Shija Academy of Nursing","year":"2026","grade":""}]	[]	\N			2026-05-18		Hinduism	[]					2026-07-17 11:08:28.369738	2026-07-17 11:08:28.369738
60	16	1	1996-12-02	Male	Single	\N	Ningthoujam Gulamchat	Ningthoujam Resheshwori		\N	\N	Khurai Kongpal Laishram Leikai - Imphal East-795010	Khurai Kongpal Laishram Leikai - Imphal East-795010	[{"qualification":"HSLC","institution":"Khurai Popular High School","year":"2012","grade":"53.6%"},{"qualification":"HSE","institution":"T.G Hr Sec School","year":"2014","grade":"58.8%"},{"qualification":"BSc. Nursing","institution":"Kangleipak Medical & Nursing Institution","year":"2018","grade":"71%"}]	[]	\N			2019-04-17		Hinduism	[]					2026-07-17 11:38:08.140393	2026-07-17 11:38:08.140393
61	17	1	1991-03-25	Female	Married	\N	Beishamayum Inaomacha Singh	Beishamayum Thoibi Devi	Atom Shanta Singh	\N	\N	Khongman Zone IV, Imphal East-795008	Khongman Zone IV, Imphal East-795008	[{"qualification":"HSLC","institution":"NIOS","year":"2008","grade":"Passed"},{"qualification":"HSE","institution":"Kanan Devi Memorial School, Imphal","year":"2010","grade":"Passed"},{"qualification":"GNM","institution":"Kangleipak Medical & Nursing Institution","year":"2013","grade":"Second division"}]	[{"employer":"Suba Hospital","designation":"Trainee Nurse","from":"10/05/2013","to":"10/05/2014","responsibilities":""}]	\N		8200017075	2014-06-23		Hinduism	[]					2026-07-18 05:11:12.64478	2026-07-18 05:11:12.64478
62	18	1	1992-03-06	Female	Married	\N	Kabrambam Gunamani	Kabrambam Thoibi	Kabrambam Prasanjit	\N	\N	Luwangsangbam Awang Leikai, Imphal East	Luwangsangbam Awang Leikai, Imphal East	[{"qualification":"HSLC","institution":"Grace Academy School","year":"2007","grade":"55.4%"},{"qualification":"HSE","institution":"Damdei Christian College","year":"2009","grade":"60.6%"},{"qualification":"BSc. Nursing","institution":"K.T.G College of Nursing","year":"2014","grade":"64.20%"}]	[{"employer":"Sunrise Hospital Gurgoan","designation":"Nursing Officer","from":"25/10/2013","to":"20/01/2015","responsibilities":""},{"employer":"Goyal Hospital, Delhi","designation":"Nursing Officer","from":"04/09/2015","to":"30/08/2017","responsibilities":""},{"employer":"Hitachi MGRM NET","designation":"Tele-Medicine Staff","from":"04/07/24","to":"01/08/2025","responsibilities":""}]	\N			2026-06-08		Hinduism	[{"name":"Laikhuram Prasanjit","percentage":100,"relationship":"Spouse"}]					2026-07-18 05:35:35.676183	2026-07-18 05:35:35.676183
63	18	2	1992-03-06	Female	Married	\N	Kabrambam Gunamani	Kabrambam Thoibi	Kabrambam Prasanjit	\N	\N	Luwangsangbam Awang Leikai, Imphal East	Luwangsangbam Awang Leikai, Imphal East	[{"qualification":"HSLC","institution":"Grace Academy School","year":"2007","grade":"55.4%"},{"qualification":"HSE","institution":"Damdei Christian College","year":"2009","grade":"60.6%"},{"qualification":"BSc. Nursing","institution":"K.T.G College of Nursing","year":"2014","grade":"64.20%"}]	[{"employer":"Sunrise Hospital Gurgoan","designation":"Nursing Officer","from":"25/10/2013","to":"20/01/2015","responsibilities":""},{"employer":"Goyal Hospital, Delhi","designation":"Nursing Officer","from":"04/09/2015","to":"30/08/2017","responsibilities":""},{"employer":"Hitachi MGRM NET","designation":"Tele-Medicine Staff","from":"04/07/24","to":"01/08/2025","responsibilities":""}]	\N			\N	\N	Hinduism	[{"name":"Laikhuram Prasanjit","percentage":100,"relationship":"Spouse"}]					2026-07-18 05:37:24.347998	2026-07-18 05:37:24.347998
64	19	1	1994-03-15	Female	Married	\N	Hanglem Nodiachand Singh	Hanglem(O) Santa Devi	Khaidem Maipaksana	\N	\N	Pungdongbam Makha Leikai- Imphal East	Pungdongbam Makha Leikai- Imphal East	[{"qualification":"HSLC","institution":"Khongjom Standard English School","year":"2010","grade":"Third Division"},{"qualification":"HSE","institution":"Brajalal Institute of Science","year":"2012","grade":"Second Division"},{"qualification":"GNM","institution":"Shija Academy of Nursing","year":"2016","grade":"Passed"},{"qualification":"PB BSc. Nursing","institution":"Arya College of Nursing, Guwahati","year":"2018","grade":"Passed"}]	[{"employer":"GNRC Ltd, Dispur, Guwahati","designation":"Staff Nurse, SICU","from":"25/09/2018","to":"18/05/2020","responsibilities":""},{"employer":"Imphal Heart Institute, Imphal West","designation":"Staff Nurse, ICCU","from":"03/10/2020","to":"16/02/21","responsibilities":""}]	\N			2025-08-07		Hinduism	[{"name":"Khaidem Maipaksana","percentage":100,"relationship":"Spouse"}]					2026-07-18 06:00:00.982788	2026-07-18 06:00:00.982788
65	19	2	1994-03-15	Female	Married	\N	Hanglem Nodiachand Singh	Hanglem(O) Santa Devi	Khaidem Maipaksana	\N	\N	Pungdongbam Makha Leikai- Imphal East	Pungdongbam Makha Leikai- Imphal East	[{"qualification":"HSLC","institution":"Khongjom Standard English School","year":"2010","grade":"Third Division"},{"qualification":"HSE","institution":"Brajalal Institute of Science","year":"2012","grade":"Second Division"},{"qualification":"GNM","institution":"Shija Academy of Nursing","year":"2016","grade":"Passed"},{"qualification":"PB BSc. Nursing","institution":"Arya College of Nursing, Guwahati","year":"2018","grade":"Passed"}]	[{"employer":"GNRC Ltd, Dispur, Guwahati","designation":"Staff Nurse, SICU","from":"25/09/2018","to":"18/05/2020","responsibilities":""},{"employer":"Imphal Heart Institute, Imphal West","designation":"Staff Nurse, ICCU","from":"03/10/2020","to":"16/02/21","responsibilities":""}]	\N			\N	\N	Hinduism	[{"name":"Khaidem Maipaksana","percentage":100,"relationship":"Spouse"}]	MNC-13405/21	2026-12-27			2026-07-18 06:04:03.858538	2026-07-18 06:04:03.858538
66	20	1	1999-01-28	Female	Single	\N	Pukhrambam Arunkumar	Pukhrambam Kamala Devi		\N	\N	Lilong Chajing Chingkhong Pukhri Achouba Mapal, Imphal West-795130	Lilong Chajing Chingkhong Pukhri Achouba Mapal, Imphal West-795130	[]	[]	\N			2022-01-10		Hinduism	[]					2026-07-18 07:05:50.105484	2026-07-18 07:05:50.105484
67	20	2	1999-01-28	Female	Single	\N	Pukhrambam Arunkumar	Pukhrambam Kamala Devi		\N	\N	Lilong Chajing Chingkhong Pukhri Achouba Mapal, Imphal West-795130	Lilong Chajing Chingkhong Pukhri Achouba Mapal, Imphal West-795130	[{"qualification":"BSc. Nursing","institution":"International Hospital College of Nursing, Guwahati","year":"2020","grade":"Passed"}]	[]	\N			\N	\N	Hinduism	[]					2026-07-18 07:07:52.593999	2026-07-18 07:07:52.593999
68	21	1	1987-02-03	Female	Married	\N	Tourangbam Biren Singh	Tourangbam(o) Memcha Devi	Arambam Ruhini	\N	\N	Naoremthong Laishram Leirak	Naoremthong Laishram Leirak	[{"qualification":"HSLC","institution":"Kodompoki Standard High School","year":"2002","grade":"Passed"},{"qualification":"HSE","institution":"Aditya Sr. Sec. School, Uttam Nagar, Delhi","year":"2004","grade":"First Division"},{"qualification":"GNM","institution":"Kavuri Subha Rao School of Nursimg, Guntur","year":"2010","grade":"Passed"}]	[{"employer":"Sunder Lal Jain Charitable Hospital","designation":"Staff Nurse, CCU","from":"13/10/2010","to":"21/11/2013","responsibilities":""}]	\N			2015-01-22		Hinduism	[]					2026-07-18 08:46:25.126579	2026-07-18 08:46:25.126579
69	22	1	2003-03-07	Female	Single	\N	Late Mayengbam Geetchandra Singh	Mayengbam Ranjana Devi		\N	\N	Keishamthong Elangbam Leikai, Imphal West-795001	Keishamthong Elangbam Leikai, Imphal West-795001	[{"qualification":"HSLC","institution":"R.K. Sanatombi Devi Vidyala","year":"2018","grade":"Passed"},{"qualification":"SSCE","institution":"R.K Sanatombi Devi Vidyala","year":"2020","grade":"Passed"},{"qualification":"B.A Geography Honours","institution":"Imphal College","year":"2023","grade":"Passed"}]	[{"employer":"Assam Down Town University, Counsel, Keishampat","designation":"Front Desk","from":"One Year","to":"","responsibilities":""}]	\N			2026-06-01		Hinduism	[]					2026-07-18 09:00:30.569115	2026-07-18 09:00:30.569115
70	23	1	1999-12-30	Male	Single	\N	Elangbam Punshi Singh	Elangbam Debala Devi		\N	\N	Moidangpok Khunou	Moidangpok Khunou	[{"qualification":"HSLC","institution":"Brighter Academy","year":"2015","grade":"56%"},{"qualification":"HSE","institution":"Johnstone Higher Secondary School","year":"2017","grade":"53.8%"},{"qualification":"BSc.  Botany Honours","institution":"Oriental College","year":"2020","grade":"83.5%"},{"qualification":"MSc. Biotechnology","institution":"Manipur University","year":"2023","grade":"63.04%"},{"qualification":"Fellowship in Embryology","institution":"Sri Siddhartha Academy of Higher Education, Tumkur","year":"2026","grade":"64%"}]	[]	\N			2026-06-01		Hinduism	[]					2026-07-18 09:17:02.922881	2026-07-18 09:17:02.922881
71	24	1	2001-03-02	Female	Single	\N	Thokchom Suresh Singh	Thokchm(O) Keilani Devi		\N	\N	Wangkhei Thangapat Mapal	Wangkhei Thangapat Mapal	[{"qualification":"HSLC","institution":"Nongpok Maheikol School","year":"2017","grade":"Second Division"},{"qualification":"HSE","institution":"Pioneer Academy","year":"2019","grade":"First Division"},{"qualification":"Bsc. Botany Honours","institution":"G.P Women's College","year":"2023","grade":"First Division"}]	[]	\N			2026-06-08		Hinduism	[]					2026-07-18 11:05:01.736597	2026-07-18 11:05:01.736597
72	25	1	1998-03-01	Female	Single	\N	Oinam Amuba Singh	Oinam Ibetombi Devi		\N	\N	Thanga Chingkha	Thanga Chingkha	[{"qualification":"HSLC","institution":"Children Model Academy Thanga","year":"2013","grade":"Second Division"},{"qualification":"HSE","institution":"Moirang Multipurpose Hr. Sec","year":"2015","grade":"Passed"},{"qualification":"BSc. Nursing","institution":"MSB College of Nursing","year":"2021","grade":"Passed"}]	[]	\N			2024-08-03		Hinduism	[]	MNC-15086/23				2026-07-18 11:12:51.00188	2026-07-18 11:12:51.00188
73	26	1	2005-07-30	Female	Single	\N	Brahmacharimayum Ngouba Sharma	Brahmacharimayum Rebeshwori Devi		\N	\N	Wangkhei Pukhrambam Leirak	Wangkhei Pukhrambam Leirak	[{"qualification":"HSLC","institution":"St. Sebestian High School","year":"2021","grade":"50%"},{"qualification":"HSE","institution":"T.G Hr Sec School","year":"2023","grade":"55%"}]	[]	\N			2026-06-01		Hinduism	[]					2026-07-18 11:20:48.808546	2026-07-18 11:20:48.808546
74	27	1	1997-03-23	Female	Single	\N	Samjetsabam Rajen Singh	Samjetsabam Surodhoni		\N	\N	Thangapat Mapal Palace Compound	Thangapat Mapal Palace Compound	[{"qualification":"HSLC","institution":"MM Higher Secondary School","year":"2013","grade":"Passed"},{"qualification":"HSE","institution":"Kanan Devi Memorial School, Imphal","year":"2016","grade":"Passed"},{"qualification":"BSc. Nursing","institution":"SIMS Group of Institution, Guntur, Andra Pradesh","year":"2020","grade":"Passed"}]	[{"employer":"Amaravathi Hospital, Andra Pradesh","designation":"Intern","from":"6months","to":"","responsibilities":""}]	\N			2021-09-16		Hinduism	[]					2026-07-19 03:03:40.666774	2026-07-19 03:03:40.666774
86	38	1	1994-03-30	Female	Married	\N	Soram Upendro Singh	Angom Geetarani Devi		\N	\N	Wangkhei Hijam Leirak, Imphal East-795005	Wangkhei Hijam Leirak, Imphal East-795005	[{"qualification":"HSLC","institution":"St. George High School","year":"2009","grade":"Second Division"},{"qualification":"HSSLC","institution":"Pioneer Academy","year":"2011","grade":"First Division"},{"qualification":"BHMS","institution":"Birbhum Vevekananda Homeopathy Medical College & Hospital, West Bengal","year":"2019","grade":"First Division"},{"qualification":"Master in Public Health","institution":"Sai Institute of Paramedical & Allied Science, Dehradun","year":"2024","grade":"First Division"}]	[]	\N			2020-10-01		Hinduism	[]					2026-07-19 11:14:37.694522	2026-07-19 11:14:37.694522
75	28	1	1987-01-02	Male	Married	\N	Late Phuritshabam Kula	Phuritshabam Inakhunbi Devi	Yanglem Rekison Singh	\N	\N	Samurou- Imphal West	Samurou- Imphal West	[{"qualification":"HSLC","institution":"Right Step English School","year":"2002","grade":"Passed"},{"qualification":"HSE","institution":"Presidency College","year":"2004","grade":"Passed"},{"qualification":"GNM","institution":"Sri Uma Maheshwara School of Nursing, Kurnool","year":"2009","grade":"Passed"}]	[{"employer":"AMRI Hospital Kolkata","designation":"Staff Nurse, Ward","from":"14/04/2009","to":"14/11/2010","responsibilities":""},{"employer":"Peerless Hospital & B.K. Roy Research Centre","designation":"Staff Nurse, ITU","from":"28/11/2011","to":"15/03/2014","responsibilities":""}]	\N			2014-09-23		Hinduism	[{"name":"Yanglem Rekison","percentage":100,"relationship":"Spouse"}]					2026-07-19 03:55:58.91977	2026-07-19 03:55:58.91977
76	29	1	1981-02-01	Female	Single	\N	Late Maibam Nilababu	Maibam Kaboklei		\N	\N	Keirao Wangkhem, Imphal East-795008	Keirao Wangkhem, Imphal East-795008	[{"qualification":"HSLC","institution":"Usha Bhavan High School","year":"1999","grade":"Passed"},{"qualification":"HSE","institution":"Western College","year":"2001","grade":"Passed"},{"qualification":"GNM","institution":"Chaitany School of Nursing","year":"2004","grade":"Passed"}]	[{"employer":"Apollo","designation":"Staff Nurse, Emergency","from":"01/09/2004","to":"30/09/2008","responsibilities":""},{"employer":"AMRI Hospital, Kolkata","designation":"ICCU","from":"12/10/2008","to":"04/06/2013","responsibilities":""}]	\N			2014-04-01		Hinduism	[]					2026-07-19 04:18:14.994921	2026-07-19 04:18:14.994921
77	30	1	1981-11-05	Female	Widowed	\N	Leitanthem Sohodev Singh	Leitanthem Roma Devi		\N	\N	Keishamthong Ahanthem Leikai, Imphal West-795001	Keishamthong Ahanthem Leikai, Imphal West-795001	[{"qualification":"HSLC","institution":"Little Rose Hr. Sc. School","year":"1998","grade":"Passed"},{"qualification":"HSE","institution":"Ng. Mani College","year":"2001","grade":"Passed"},{"qualification":"GNM","institution":"Vijiya School of Nursing, Andhra Pradesh","year":"2004","grade":"Passed"}]	[{"employer":"Sahi Hospital","designation":"Staff Nurse","from":"01/09/2004","to":"30/06/2005","responsibilities":""},{"employer":"AMRI Hospital, Kolkata","designation":"Staff Nurse, ITU","from":"29/05/2007","to":"27/03/2009","responsibilities":""},{"employer":"Peerless Hospital and B.K. Roy Research Centre","designation":"Staff Nurse","from":"7/05/2012","to":"21/04/2013","responsibilities":""},{"employer":"Shija Hospitals And Research Institute","designation":"Apprentice Nurse","from":"13/01/2006","to":"13/04/2006","responsibilities":""}]	\N			2014-11-24		Hinduism	[]					2026-07-19 05:29:07.056398	2026-07-19 05:29:07.056398
78	31	1	2001-03-14	Female	Single	\N	Chungkham Basanta	Chungkham Geeta		\N	\N	Ghari Awang Leikai, Imphal  West-795001	Ghari Awang Leikai, Imphal  West-795001	[{"qualification":"HSLC","institution":"Kodompokpi Standard High School","year":"2016","grade":"47%"},{"qualification":"HSE","institution":"HRD Academy Ghari","year":"2018","grade":"44.3%"},{"qualification":"GNM","institution":"Nightingle Nursing Institute, Porompat ","year":"2021","grade":"Passed"}]	[{"employer":"Chamber of Commerce Medical Care and Reaserch Centre","designation":"","from":"15/11/2021","to":"15/12/2021","responsibilities":""}]	\N			2023-10-05		Hinduism	[]	MNC-14576/22				2026-07-19 05:48:50.105987	2026-07-19 05:48:50.105987
79	31	2	2001-03-14	Female	Single	\N	Chungkham Basanta	Chungkham Geeta		\N	\N	Ghari Awang Leikai, Imphal  West-795001	Ghari Awang Leikai, Imphal  West-795001	[{"qualification":"HSLC","institution":"Kodompokpi Standard High School","year":"2016","grade":"47%"},{"qualification":"HSE","institution":"HRD Academy Ghari","year":"2018","grade":"44.3%"},{"qualification":"GNM","institution":"Nightingle Nursing Institute, Porompat ","year":"2021","grade":"Passed"}]	[{"employer":"Chamber of Commerce Medical Care and Reaserch Centre","designation":"","from":"15/11/2021","to":"15/12/2021","responsibilities":""}]	\N			\N	\N	Hinduism	[]	MNC-14576/22				2026-07-19 05:52:20.707521	2026-07-19 05:52:20.707521
80	32	1	2000-04-01	Female	Single	\N	Khomdram Okendra	Late Kh(O). Memchoubi Devi		\N	\N	Palace Compound, Thangapat Mapal, Imphal East-795001	Palace Compound, Thangapat Mapal, Imphal East-795001	[{"qualification":"HSLC","institution":"Wangkhei High School","year":"2015","grade":"56%"},{"qualification":"HSE","institution":"Pioneer Academy","year":"2017","grade":"68%"},{"qualification":"BSc. Nursing","institution":"Tirumala College of Nursing","year":"2022","grade":"70%"}]	[{"employer":"Rainbow Children Hospital, Hydrabad","designation":"Staff Nurse NICU","from":"2 Months","to":"","responsibilities":""},{"employer":"Tirumala Hospital","designation":"Intern","from":"6Months","to":"","responsibilities":""}]	\N			2022-12-01		Hinduism	[]	MNC-15565/23				2026-07-19 07:37:13.744481	2026-07-19 07:37:13.744481
81	33	1	2001-12-16	Female	Single	\N	Heikrujam Chandra Singh	Heikrujam(O) Maloti Devi		\N	\N	Andro Mamang Leikai, Imphal East-795149	Andro Mamang Leikai, Imphal East-795149	[{"qualification":"HSLC","institution":"K.M Blooming Hr. Sec. School, Khangabok","year":"2017","grade":"67%"},{"qualification":"HSSLC","institution":"KM Blooming Hr. Sec. School, Kangabok","year":"2019","grade":"60%"},{"qualification":"GNM","institution":"Bethesda College of Nursing, CCpur","year":"2023","grade":"67.4%"}]	[]	\N			2025-05-13		Hinduism	[]	MNC-16752/24				2026-07-19 09:04:52.076924	2026-07-19 09:04:52.076924
82	34	1	1992-09-19	Male	Married	\N	Laiphrakpam Khomdon Singh	Laiphrakpam(O) Sabitri Devi	Yumnam Bidyalaxmi Devi	\N	\N	Bamon Kampu Makha Leikai, Imphal East-795008	Bamon Kampu Makha Leikai, Imphal East-795008	[{"qualification":"HSLC","institution":"Laishram Mani Memorial School","year":"2007","grade":"49%"},{"qualification":"HSSLC","institution":"Advance Innovative Modern School, Khongman Mangjil","year":"2009","grade":"51%"},{"qualification":"D. Pharm","institution":"Regional Istitute of Pharmacuetical Science & Technology","year":"2014","grade":"55.1%"}]	[{"employer":"","designation":"","from":"","to":"","responsibilities":""}]	\N			2014-08-12		Hinduism	[]					2026-07-19 10:04:47.955864	2026-07-19 10:04:47.955864
83	35	1	1993-02-09	Female	Married	\N	Aribam Chaoba Sharma	Aribam Radha Devi		\N	\N	Khongman	Khongman	[]	[]	\N			2023-10-01		Hinduism	[]					2026-07-19 10:19:50.511471	2026-07-19 10:19:50.511471
84	36	1	1998-03-01	Female	Married	\N	Rajen Yengkhom	Memi Yengkhom	Asem Tompok Singh	\N	\N	Mayang Imphal Thana Awang Leikai, Imphal West-795132	Mayang Imphal Thana Awang Leikai, Imphal West-795132	[{"qualification":"HSLC","institution":"Standard Robart Hr. Sec. School","year":"2013","grade":"67%"},{"qualification":"HSSLC","institution":"T.G Hr Sec School","year":"2015","grade":"70.8%"},{"qualification":"BHMS","institution":"Dr, B.D. Jatti Homeopathic Medical College, Karnataka","year":"2022","grade":"64.4%"}]	[{"employer":"Care and Cure Hospital","designation":"RMO","from":"14/11/2022","to":"30/10/25","responsibilities":""}]	\N			2026-05-08		Hinduism	[{"name":"Asem Tompok Singh","percentage":100,"relationship":"Spouse"}]					2026-07-19 10:51:25.899452	2026-07-19 10:51:25.899452
85	37	1	2000-03-29	Female	Single	\N	Late Waikhom Lukhoi Singh	Waikhom Rupabati Singh		\N	\N	Kyamgei Maning Leikai	Kyamgei Maning Leikai	[{"qualification":"HSLC","institution":"Standard Robarth Hr. Sec. School","year":"2015","grade":"60.4%"},{"qualification":"HSE","institution":"Standard Robarth Hr. Sec. School","year":"2017","grade":"60.6%"},{"qualification":"BHMS","institution":"Solan Homeopathic Medical College & Hospital","year":"2024","grade":"61.6%"},{"qualification":"","institution":"","year":"","grade":""}]	[{"employer":"District Hospital, Thoubal","designation":"RMO","from":"6months","to":"","responsibilities":""}]	\N			2025-01-05		Hinduism	[]					2026-07-19 11:01:25.660332	2026-07-19 11:01:25.660332
87	39	1	1998-01-23	Female	Single	\N	Shamanduram Nabakumar Singh	Shamanduram(O) Bimola Devi		\N	\N	Kongba Nandeibam Leikai, Imphal East-795008	Kongba Nandeibam Leikai, Imphal East-795008	[{"qualification":"HSLC","institution":"Brighter Academy","year":"2013","grade":"65.6%"},{"qualification":"HSSLC","institution":"T.G Hr Sec School","year":"2015","grade":"67.2%"},{"qualification":"BHMS","institution":"Dr. Bhim Rao Bakson Homeopathic Medical College, Greater Noida","year":"2021","grade":"65.7%"}]	[]	\N			2025-06-01		Hinduism	[]					2026-07-19 11:32:00.159915	2026-07-19 11:32:00.159915
88	40	1	1989-03-03	Male	Single	\N	Late Khangembam Ibohal Singh	Late Khangembam Jandho Devi		\N	\N	Singjamei Wangma Bheigyabati Leikai Kongba Road-Imphal East	Singjamei Wangma Bheigyabati Leikai Kongba Road-Imphal East	[{"qualification":"HSLC","institution":"NIOS","year":"2005","grade":"71.6%"},{"qualification":"Diploma in X-Ray Technician","institution":"Cochin Institute of Technology","year":"2010","grade":"76%"},{"qualification":"Diploma in Electrocardiogram","institution":"Cochin Institute of Technology","year":"2010","grade":"78%"}]	[{"employer":"Mona Laboratory","designation":"Radiographer","from":"01/02/2011","to":"25/11/2024","responsibilities":""},{"employer":"JN. Hospital, Porompat","designation":"Radiographer","from":"01/10/2010","to":"31/03/2011","responsibilities":""}]	\N			2025-11-04		Hinduism	[]					2026-07-19 11:51:01.299451	2026-07-19 11:51:01.299451
89	41	1	1994-02-20	Female	Married	\N	Thiyam Amuba Singh	Huidrom Tabopi Devi		\N	\N	Wangkhei Ningthem Pukhri Makha Leirak	Wangkhei Ningthem Pukhri Makha Leirak	[]	[]	\N			2021-03-15		Hinduism	[]					2026-07-19 11:58:06.203951	2026-07-19 11:58:06.203951
90	41	2	1994-02-20	Female	Married	\N	Thiyam Amuba Singh	Huidrom Tabopi Devi		\N	\N	Wangkhei Ningthem Pukhri Makha Leirak	Wangkhei Ningthem Pukhri Makha Leirak	[]	[]	\N			\N	\N	Hinduism	[]					2026-07-19 12:02:01.884437	2026-07-19 12:02:01.884437
91	42	1	1994-03-10	Female	Married	\N	Takhenchangbam Ishingchaoba Sharma	Takhenchangbam Binarani	Kangujam Rajiv Singh	\N	\N	Khongman Bashikhong, Imphal East-795008	Khongman Bashikhong, Imphal East-795008	[{"qualification":"HSSLC","institution":"Advance Innovative Modern School, Khongman Mangjil","year":"2011","grade":"First Division"},{"qualification":"BHMS","institution":"Alvas Homeopathic Medical College","year":"2019","grade":"First Division"}]	[]	\N			2020-07-21		Hinduism	[{"name":"Kangujam Rajiv Singh","percentage":100,"relationship":"Spouse"}]					2026-07-21 02:35:28.790132	2026-07-21 02:35:28.790132
92	42	2	1994-03-10	Female	Married	\N	Takhenchangbam Ishingchaoba Sharma	Takhenchangbam Binarani	Kangujam Rajiv Singh	\N	\N	Khongman Bashikhong, Imphal East-795008	Khongman Bashikhong, Imphal East-795008	[{"qualification":"HSSLC","institution":"Advance Innovative Modern School, Khongman Mangjil","year":"2011","grade":"First Division"},{"qualification":"BHMS","institution":"Alvas Homeopathic Medical College","year":"2019","grade":"First Division"},{"qualification":"HSLC","institution":"St. George High School","year":"2009","grade":"Second division"}]	[]	\N			\N	\N	Hinduism	[{"name":"Kangujam Rajiv Singh","percentage":100,"relationship":"Spouse"}]					2026-07-21 02:37:06.12425	2026-07-21 02:37:06.12425
93	43	1	1998-12-12	Female	Single	\N	Chandam Ibungo Singh	Chanam Bina Devi		\N	\N	New Checkon Mandop Leirak- Imphal East	New Checkon Mandop Leirak- Imphal East	[{"qualification":"HSLC","institution":"Amutombi Devine Life English School, Wabagai","year":"2013","grade":"59%"},{"qualification":"HSSLC","institution":"Somendrosana Royal Hr. Sec. ","year":"2015","grade":"72%"},{"qualification":"BSc. Nursing","institution":"Kangleipak Medical & Nursing Institution","year":"2019","grade":"Passed"}]	[]	\N			2021-01-11		Hinduism	[]	MNC-11362/19				2026-07-21 02:51:44.796221	2026-07-21 02:51:44.796221
94	44	1	2002-02-02	Male	Single	\N	Yengkhom Rajen 	Yengkhom(O) Memi		\N	\N	Lilong Chajing Konjeng Leikai, Imphal West-795130	Lilong Chajing Konjeng Leikai, Imphal West-795130	[{"qualification":"HSLC","institution":"Standard Robart Hr. Sec. School","year":"2017","grade":"64%"},{"qualification":"HSSLC","institution":"Standard Robarth Hr. Sec. School","year":"2019","grade":"57%"},{"qualification":"Bsc. OT Technology","institution":"Saraswati Institute of Management and Paramedical Science","year":"2023","grade":"82%"}]	[{"employer":"JNIMS","designation":"Trainee OT Technician","from":"6months","to":"","responsibilities":""}]	\N			2024-06-17		Sanamahism	[]					2026-07-21 03:15:53.000235	2026-07-21 03:15:53.000235
95	45	1	2002-03-15	Female	Single	\N	Mayengbam Sarat Singh	Mayengbam(O) Jugeshwori Devi		\N	\N	Hiyanglam Makha Leikai, Kakching District-795103	Hiyanglam Makha Leikai, Kakching District-795103	[{"qualification":"HSLC","institution":"K.M Blooming Hr. Sec. School, Khangabok","year":"2017","grade":"50.6%"},{"qualification":"HSSLC","institution":"KM Blooming Hr. Sec. School, Kangabok","year":"2019","grade":"54.2%"},{"qualification":"BSc. Nursing","institution":"Bethesda College of Nursing, CCpur","year":"2023","grade":"First Division"}]	[{"employer":"Advance Speciality Hospital & Research Institute","designation":"Trainee Nurse","from":"27/02/2024","to":"27/08/24","responsibilities":""}]	\N			2024-11-24		Hinduism	[]	MNC-16753/24				2026-07-21 03:29:19.67558	2026-07-21 03:29:19.67558
96	46	1	2004-03-08	Female	Single	\N	Late RK Birarani	RK. Memcha		\N	\N	Sagolband Bijoy Govinda, Imphal West-795001	Sagolband Bijoy Govinda, Imphal West-795001	[{"qualification":"HSLC","institution":"St. Dominic Savio School","year":"2019","grade":"Second Division"},{"qualification":"HSSLC","institution":"Brilliance School","year":"2021","grade":"First Division"},{"qualification":"BA. Geography","institution":"Imphal College","year":"2024","grade":"First Division"}]	[]	\N			2026-06-06		Hinduism	[]					2026-07-21 03:40:06.412876	2026-07-21 03:40:06.412876
97	47	1	1996-10-03	Female	Married	\N	Chongtham Gandhi Singh	Chongtham(O) Sheela Devi		\N	\N	Langthabal	Langthabal	[{"qualification":"HSLC","institution":"Good Samaritan Public School, Saikhul","year":"2010","grade":"61.4%"},{"qualification":"HSSLC","institution":"HRD Academy Ghari","year":"2013","grade":"63.8%"},{"qualification":"BSc. Nursing","institution":"SIMS Group of Institution, Guntur, Andra Pradesh","year":"2017","grade":"Passed"}]	[]	\N			2019-06-10		Hinduism	[]	MNC-11698/19				2026-07-21 03:53:54.639969	2026-07-21 03:53:54.639969
98	48	1	1997-04-01	Female	Single	\N	Moirangthem Hemat Singh	Moirangthem(O)		\N	\N	Moirang Patlou Leikai, Bishnupur District	Moirang Patlou Leikai, Bishnupur District	[{"qualification":"HSLC","institution":"Advance Public School, Moirang","year":"2012","grade":"56.6%"},{"qualification":"HSSLC","institution":"Advance Intermidiate College, Moirang","year":"2014","grade":"61%"},{"qualification":"Bsc. Botany Honours","institution":"Moirang College","year":"2018","grade":"Second division"},{"qualification":"B.VOC. OTT","institution":"DMCC,DM College of Science, Imphal","year":"2021","grade":"Passed"}]	[{"employer":"JNIMS","designation":"Intern","from":"6months","to":"","responsibilities":""},{"employer":"JNIMS","designation":"Trainee OT Technician","from":"6Months","to":"","responsibilities":""}]	\N			2023-04-24		Hinduism	[]					2026-07-21 05:03:31.360593	2026-07-21 05:03:31.360593
99	49	1	1999-04-01	Female	Single	\N	Tongbram Ibochoubi Devi	Tourangbam(O) Bideshwori Devi		\N	\N	Phubala Awang Mamang Leikai, Bishnupur-795126	Phubala Awang Mamang Leikai, Bishnupur-795126	[{"qualification":"HSLC","institution":"Public School Ningthouhong","year":"2014","grade":"46.6%"},{"qualification":"HSSLC","institution":"Extra Edge School Sagolband","year":"2016","grade":"63%"},{"qualification":"BSc. Nursing","institution":"International Hospital College of Nursing","year":"2020","grade":"2021"}]	[]	\N			2021-08-09		Hinduism	[]	MNC-16505/24				2026-07-21 05:40:54.812093	2026-07-21 05:40:54.812093
100	50	1	1997-12-01	Female	Single	\N	Thanglendanla Wanoising			\N	\N	Nongmeibung Academy Road	Charoi Khullen Part 1, Churachandpur-795124	[{"qualification":"HSLC","institution":"Loyala School, Bishnupur","year":"2012","grade":"52%"},{"qualification":"HSSLC","institution":"Pioneer Academy","year":"2014","grade":"54%"},{"qualification":"DOTT","institution":"Shija Pramedical Research Academy, Langol","year":"2016","grade":"Passed"}]	[{"employer":"Shija Hospitals & Research Institute, Langol","designation":"Intern","from":"17/09/2018","to":"17/12/2018","responsibilities":""}]	\N			2020-12-01		Christianity	[]					2026-07-21 05:53:40.958664	2026-07-21 05:53:40.958664
101	51	1	1993-04-28	Female	Single	\N	Oinam Tomei Singh	Oinam(O) Shirojiji Devi		\N	\N	Kongba Makha Nadeibam Leikai, Imphal East-795008	Kongba Makha Nadeibam Leikai, Imphal East-795008	[{"qualification":"HSLC","institution":"Martin Grammar School","year":"2009","grade":"56%"},{"qualification":"HSSLC","institution":"Fancier Abriham Hr. Sec. School","year":"2011","grade":"62%"},{"qualification":"BSc. Nursing","institution":"SIMS Group of Institution, Guntur, Andra Pradesh","year":"2015","grade":"Passed"}]	[{"employer":"Medica Superspecialty Hospital, Kolkata","designation":"Staff Nurse, Ward","from":"13/01/2016","to":"27/02/2019","responsibilities":""}]	\N			2019-06-10		Hinduism	[]	MNC-7984/17				2026-07-21 06:13:52.233608	2026-07-21 06:13:52.233608
102	52	1	1987-03-01	Female	Married	\N	Kangjam Thaninjao Singh	Kangjam Manglembi Devi	Chungkham Shibakanta Singh	\N	\N	Soibam Leikai Near Citizen Club-Imphal East	Soibam Leikai Near Citizen Club-Imphal East	[{"qualification":"HSLC","institution":"Manipur Rural Institute High School","year":"2002","grade":"46.6%"},{"qualification":"HSSLC","institution":"Mem Higher Sec. School","year":"2005","grade":"38.8%"},{"qualification":"GNM","institution":"Down Town School of Nursing","year":"2009","grade":"60.6%"}]	[{"employer":"Down Town Hospital, Dispur","designation":"Staff Nurse","from":"5years","to":"","responsibilities":""},{"employer":"Pratiksha Hospital, VIP Road, Guwahati","designation":"Staff Nurse","from":"15/04/2011","to":"30/09/2013","responsibilities":""}]	\N			2014-05-12		Hinduism	[]					2026-07-21 06:36:26.344559	2026-07-21 06:36:26.344559
103	53	1	2002-10-28	Male	Single	\N	Late Yambem Shanta Singh	Elangbam Roma Devi		\N	\N	Bamon Kampu Makha Leikai, Imphal East-795008	Bamon Kampu Makha Leikai, Imphal East-795008	[{"qualification":"HSLC","institution":"Sainik View Getwell School","year":"2018","grade":"65.2%"},{"qualification":"HSE","institution":"The Eden Public School","year":"2020","grade":"68.6%"},{"qualification":"Bsc. OT Technology","institution":"Mewar University","year":"2024","grade":"70.2%"}]	[{"employer":"Acme Fertility and Healthcare Centre","designation":"Intern","from":"6months","to":"","responsibilities":""}]	\N			2026-03-01		Hinduism	[]					2026-07-21 10:05:42.093895	2026-07-21 10:05:42.093895
104	54	1	1999-04-01	Female	Married	\N	Pukhrambam Kiswarkumar Singh	Laishram Aruna Devi	Chingangbam Rakesh Singh	\N	\N	Konthoujam Mamang Leikai	Konthoujam Mamang Leikai	[{"qualification":"HSLC","institution":"Regular English High School","year":"2014","grade":"45.2%"},{"qualification":"HSE","institution":"Alpha BCI Memorial Academy","year":"2016","grade":"69.6%"},{"qualification":"BA. Education Honours","institution":"Imphal College","year":"2019","grade":"63.3%"},{"qualification":"CCCA","institution":"Padma Computer & Electronics","year":"2019","grade":"Grade A"}]	[]	\N			2021-12-29		Hinduism	[]					2026-07-21 10:17:04.998216	2026-07-21 10:17:04.998216
105	55	1	1993-01-01	Female	Married	\N	Angom Joy Singh	Angom Mitreshwori Devi	Ningthoujam Sornajit	\N	\N	Sagolband Kangabam Leikai	Sagolband Kangabam Leikai	[{"qualification":"HSLC","institution":"Hijam Irabot Memorial Public School","year":"2008","grade":"Passed"},{"qualification":"HSE","institution":"Lilong Hr. Sec. School","year":"2010","grade":"Passed"},{"qualification":"BSc.","institution":"GP Women's College","year":"2013","grade":"Second division"},{"qualification":"BCA","institution":"Allied Infotech","year":"2010","grade":"Passed"}]	[{"employer":"Acme Fertility and Healthcare Centre","designation":"Front Office Executive","from":"20/11/2013","to":"25/08/2017","responsibilities":""},{"employer":"Cloud Nine Hospital","designation":"Co ordinator cum  PA","from":"10/11/2017","to":"31/05/2022","responsibilities":""}]	\N			2022-09-01		Hinduism	[]					2026-07-21 10:42:30.007463	2026-07-21 10:42:30.007463
106	56	1	2002-01-05	Female	Single	\N	Aheibam Rameshwor Meitei	Aheibam(O) Sanathoi Leima		\N	\N	Moidangpok Aheibam Leikai	Moidangpok Aheibam Leikai	[{"qualification":"HSLC","institution":"Brighter Academy, Khumbong","year":"2018","grade":"Second Division"},{"qualification":"HSE","institution":"Ibotonsana Girls Hr. Sec. School","year":"2020","grade":"Second Division"},{"qualification":"BA","institution":"Oriental College","year":"2023","grade":"Grade A"},{"qualification":"Front Office Trainee","institution":"Skill India","year":"2024","grade":"Passed"}]	[{"employer":"Classic Group of Hotels","designation":"Intern","from":"29/06/2024","to":"28/07/2024","responsibilities":""}]	\N			2024-10-09		Sanamahism	[]					2026-07-21 10:53:55.381704	2026-07-21 10:53:55.381704
107	57	1	1982-09-13	Male	Married	\N			Laishram Romila Devi	\N	\N	Khagempalli Panthak	Khagempalli Panthak	[]	[]	\N						[]					2026-07-22 10:37:49.416656	2026-07-22 10:37:49.416656
\.


--
-- Data for Name: staff_salaries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff_salaries (id, staff_id, staff_version, basic_salary, hra, conveyance, medical, special, epf, esi, professional_tax, other_deductions, late_attendance, bank_name, account_number, ifsc_code, created_at, updated_at) FROM stdin;
1	1	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-14 10:36:30.073422	2026-07-14 10:36:30.073422
2	2	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-14 11:05:10.04269	2026-07-14 11:05:10.04269
3	1	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-14 11:09:06.589678	2026-07-14 11:09:06.589678
4	3	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-14 11:29:35.635514	2026-07-14 11:29:35.635514
5	4	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-14 11:42:03.340446	2026-07-14 11:42:03.340446
6	5	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-14 11:46:04.813456	2026-07-14 11:46:04.813456
39	5	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-15 05:50:51.389159	2026-07-15 05:50:51.389159
40	5	3	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-15 05:55:52.823015	2026-07-15 05:55:52.823015
41	4	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-15 06:01:58.420405	2026-07-15 06:01:58.420405
42	3	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000087	BKID0005042	2026-07-15 06:04:12.277237	2026-07-15 06:04:12.277237
43	4	3	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-15 06:24:45.595068	2026-07-15 06:24:45.595068
44	2	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-15 06:28:17.39188	2026-07-15 06:28:17.39188
45	6	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-15 06:52:32.219882	2026-07-15 06:52:32.219882
46	6	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000005	BKID0005042	2026-07-16 04:30:14.849395	2026-07-16 04:30:14.849395
47	7	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000037	BKID0005042	2026-07-16 04:43:58.26836	2026-07-16 04:43:58.26836
48	7	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000037	BKID0005042	2026-07-16 06:06:13.159962	2026-07-16 06:06:13.159962
49	8	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	20131064284	SBIN00161013	2026-07-16 06:25:55.548095	2026-07-16 06:25:55.548095
50	8	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	20131064284	SBIN00161013	2026-07-16 06:26:37.270394	2026-07-16 06:26:37.270394
51	9	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	45176717807	SBIN0007440	2026-07-16 07:07:30.341973	2026-07-16 07:07:30.341973
52	10	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000341	BKID0005042	2026-07-16 09:32:45.696587	2026-07-16 09:32:45.696587
53	11	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-16 11:57:21.601735	2026-07-16 11:57:21.601735
54	11	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-16 11:59:55.366225	2026-07-16 11:59:55.366225
55	10	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000341	BKID0005042	2026-07-16 12:03:39.790631	2026-07-16 12:03:39.790631
56	12	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216310000051	BKID0005042	2026-07-16 12:37:30.441535	2026-07-16 12:37:30.441535
57	13	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000014	BKID0005042	2026-07-17 05:20:49.895205	2026-07-17 05:20:49.895205
58	14	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000339	BKID0005042	2026-07-17 06:57:51.04844	2026-07-17 06:57:51.04844
59	15	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	43025039521	SBIN0063860	2026-07-17 11:08:28.33394	2026-07-17 11:08:28.33394
60	16	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-17 11:38:08.040731	2026-07-17 11:38:08.040731
61	17	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-18 05:11:12.62565	2026-07-18 05:11:12.62565
62	18	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Central Bank of India 	3797975740	CBIN0284916	2026-07-18 05:35:35.627118	2026-07-18 05:35:35.627118
63	18	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Central Bank of India 	3797975740	CBIN0284916	2026-07-18 05:37:24.293091	2026-07-18 05:37:24.293091
64	19	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	33276641661	SBIN0064728	2026-07-18 06:00:00.965556	2026-07-18 06:00:00.965556
65	19	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	33276641661	SBIN0064728	2026-07-18 06:04:03.824197	2026-07-18 06:04:03.824197
66	20	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-18 07:05:49.988922	2026-07-18 07:05:49.988922
67	20	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-18 07:07:52.562581	2026-07-18 07:07:52.562581
68	21	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-18 08:46:25.06238	2026-07-18 08:46:25.06238
69	22	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	43437833017	SBIN0019133	2026-07-18 09:00:30.543922	2026-07-18 09:00:30.543922
70	23	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Manipur Rural Bank 	9001010127080	PUNBORRBMRB	2026-07-18 09:17:02.876127	2026-07-18 09:17:02.876127
71	24	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	42908447741	SBIN0064378	2026-07-18 11:05:01.709199	2026-07-18 11:05:01.709199
72	25	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Axis Bank	921010010763260	UTIB0000289	2026-07-18 11:12:50.940107	2026-07-18 11:12:50.940107
73	26	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Manipur Rural Bank 	9012010071576	UTIBORRBMRB	2026-07-18 11:20:48.787579	2026-07-18 11:20:48.787579
74	27	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 03:03:40.632947	2026-07-19 03:03:40.632947
75	28	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 03:55:58.887638	2026-07-19 03:55:58.887638
76	29	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 04:18:14.9616	2026-07-19 04:18:14.9616
77	30	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000088	BKID0005042	2026-07-19 05:29:07.01287	2026-07-19 05:29:07.01287
78	31	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 05:48:50.064709	2026-07-19 05:48:50.064709
79	31	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	39811951923	SBIN0005320	2026-07-19 05:52:20.672498	2026-07-19 05:52:20.672498
80	32	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	39006522581	SBIN0011626	2026-07-19 07:37:13.705743	2026-07-19 07:37:13.705743
81	33	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 09:04:52.035353	2026-07-19 09:04:52.035353
82	34	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 10:04:47.891951	2026-07-19 10:04:47.891951
83	35	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	32179873860	SBIN0007440	2026-07-19 10:19:50.4806	2026-07-19 10:19:50.4806
84	36	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	35138342698	SBIN0017403	2026-07-19 10:51:25.843582	2026-07-19 10:51:25.843582
85	37	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 11:01:25.619179	2026-07-19 11:01:25.619179
86	38	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000295	BKID0005042	2026-07-19 11:14:37.650164	2026-07-19 11:14:37.650164
87	39	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	44333213185	SBIN0017403	2026-07-19 11:32:00.123248	2026-07-19 11:32:00.123248
88	40	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	34091787087	SBIN0017403	2026-07-19 11:51:01.273276	2026-07-19 11:51:01.273276
89	41	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 11:58:06.166793	2026-07-19 11:58:06.166793
90	41	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 12:02:01.846926	2026-07-19 12:02:01.846926
91	42	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000286	BKID0005042	2026-07-21 02:35:28.677048	2026-07-21 02:35:28.677048
92	42	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000286	BKID0005042	2026-07-21 02:37:06.087168	2026-07-21 02:37:06.087168
93	43	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 02:51:44.743164	2026-07-21 02:51:44.743164
94	44	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 03:15:52.93204	2026-07-21 03:15:52.93204
95	45	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 03:29:19.64796	2026-07-21 03:29:19.64796
96	46	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	4134782783	SBIN0018546	2026-07-21 03:40:06.194107	2026-07-21 03:40:06.194107
97	47	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 03:53:54.614574	2026-07-21 03:53:54.614574
98	48	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 05:03:31.315294	2026-07-21 05:03:31.315294
99	49	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 05:40:54.792989	2026-07-21 05:40:54.792989
100	50	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 05:53:40.921426	2026-07-21 05:53:40.921426
101	51	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 06:13:52.204259	2026-07-21 06:13:52.204259
102	52	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 06:36:26.324853	2026-07-21 06:36:26.324853
103	53	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 10:05:42.079949	2026-07-21 10:05:42.079949
104	54	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000237	BKID0005042	2026-07-21 10:17:04.974865	2026-07-21 10:17:04.974865
105	55	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000046	BKID0005042	2026-07-21 10:42:29.969813	2026-07-21 10:42:29.969813
106	56	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Manipur Rural Bank 	9024010030454	PUNBORRBHRB	2026-07-21 10:53:55.290714	2026-07-21 10:53:55.290714
107	57	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-22 10:37:49.364908	2026-07-22 10:37:49.364908
\.


--
-- Data for Name: staff_supervisors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff_supervisors (id, staff_id, staff_version, supervisor1_id, supervisor2_id, created_at, updated_at) FROM stdin;
1	1	2	\N	\N	2026-07-14 11:09:06.639669	2026-07-14 11:09:06.639669
2	5	2	\N	\N	2026-07-15 05:50:51.504305	2026-07-15 05:50:51.504305
3	5	3	\N	\N	2026-07-15 05:55:52.866879	2026-07-15 05:55:52.866879
4	4	2	\N	\N	2026-07-15 06:01:58.50058	2026-07-15 06:01:58.50058
5	3	2	\N	\N	2026-07-15 06:04:12.368265	2026-07-15 06:04:12.368265
6	4	3	\N	\N	2026-07-15 06:24:45.670954	2026-07-15 06:24:45.670954
7	2	2	\N	\N	2026-07-15 06:28:17.57589	2026-07-15 06:28:17.57589
8	6	2	\N	\N	2026-07-16 04:30:14.935178	2026-07-16 04:30:14.935178
9	7	2	\N	\N	2026-07-16 06:06:13.205306	2026-07-16 06:06:13.205306
10	8	2	\N	\N	2026-07-16 06:26:37.331875	2026-07-16 06:26:37.331875
11	11	2	\N	\N	2026-07-16 11:59:55.451628	2026-07-16 11:59:55.451628
12	10	2	\N	\N	2026-07-16 12:03:39.882042	2026-07-16 12:03:39.882042
13	18	2	\N	\N	2026-07-18 05:37:24.375743	2026-07-18 05:37:24.375743
14	19	2	\N	\N	2026-07-18 06:04:03.896663	2026-07-18 06:04:03.896663
15	20	2	\N	\N	2026-07-18 07:07:52.629726	2026-07-18 07:07:52.629726
16	31	2	\N	\N	2026-07-19 05:52:20.74698	2026-07-19 05:52:20.74698
17	41	2	\N	\N	2026-07-19 12:02:01.924707	2026-07-19 12:02:01.924707
18	42	2	\N	\N	2026-07-21 02:37:06.175162	2026-07-21 02:37:06.175162
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, date, description, category, type, amount, payment_method, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."user" (id, name, email, "emailVerified", image, role, banned, "banReason", "banExpires", "createdAt", "updatedAt", "mustChangePassword") FROM stdin;
CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	ningthoujamronita3786@gmail.com	f	\N	hr	f	\N	\N	2026-07-14 11:10:25.11	2026-07-14 11:10:25.11	f
Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	Khundrakpam Memtombi Devi	echanthoibi69992@gmail.com	f	\N	staff	f	\N	\N	2026-07-14 11:46:50.145	2026-07-14 11:46:50.145	f
3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	Maibam Romita Devi	mromita1993@gmail.com	f	\N	staff	f	\N	\N	2026-07-14 11:46:57.189	2026-07-14 11:46:57.189	f
nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	Keithellakpam Sonilata Devi	keithellakpamsanny@gmail.com	f	\N	staff	f	\N	\N	2026-07-14 11:47:05.171	2026-07-14 11:47:05.171	f
tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	Ngangkham Tarunkumar Singh	tarunng12@gmail.com	f	\N	staff	f	\N	\N	2026-07-14 11:47:13.286	2026-07-14 11:47:13.286	f
Ka7zRdnBC1l9KZ271rUof2l6QWVrB1Zb	Akoijam Maheshwor Singh	maheshwor2014singh@gamil.com	f	\N	staff	f	\N	\N	2026-07-16 11:57:43.175	2026-07-16 11:57:43.175	f
1Dv121z8xdadYrlt8gVSvuFytyzP7KGH	Priyanka Laishram	priyankalaishram2002@gmail.com	f	\N	staff	f	\N	\N	2026-07-16 11:58:15.511	2026-07-16 11:58:15.511	f
52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	subhashck@gmail.com	t	\N	admin	f	\N	\N	2026-07-14 09:14:46.465	2026-07-22 10:39:20.172	f
4jkPcSiE1XLo8XjDPon3LlNzhvgC5cls	System Administrator	admin@acmehospital.health	t	\N	admin	f	\N	\N	2026-07-23 06:18:24.441	2026-07-23 06:18:24.441	f
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vendors (id, name, gst_number, contact_person, phone, address, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: verification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: appointments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.appointments_id_seq', 1, false);


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendance_id_seq', 1, false);


--
-- Name: banks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.banks_id_seq', 8, true);


--
-- Name: biometric_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.biometric_mappings_id_seq', 1, false);


--
-- Name: consultant_rates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.consultant_rates_id_seq', 1, false);


--
-- Name: daily_additional_income_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_additional_income_id_seq', 1, false);


--
-- Name: daily_closing_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_closing_reports_id_seq', 11, true);


--
-- Name: daily_discounts_returns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_discounts_returns_id_seq', 775, true);


--
-- Name: daily_expenditures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_expenditures_id_seq', 3365, true);


--
-- Name: daily_ipd_admissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_ipd_admissions_id_seq', 1, false);


--
-- Name: daily_ipd_discharges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_ipd_discharges_id_seq', 1, false);


--
-- Name: daily_payment_channels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_payment_channels_id_seq', 2202, true);


--
-- Name: daily_pharmacy_income_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_pharmacy_income_id_seq', 1, false);


--
-- Name: daily_service_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_service_lines_id_seq', 7642, true);


--
-- Name: daily_staff_advances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.daily_staff_advances_id_seq', 9, true);


--
-- Name: department_leaders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.department_leaders_id_seq', 35, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departments_id_seq', 22, true);


--
-- Name: designations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.designations_id_seq', 43, true);


--
-- Name: encounters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.encounters_id_seq', 1, false);


--
-- Name: expense_catalog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expense_catalog_id_seq', 45, true);


--
-- Name: expense_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expense_categories_id_seq', 37, true);


--
-- Name: grn_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grn_items_id_seq', 1, false);


--
-- Name: grns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grns_id_seq', 1, false);


--
-- Name: immunization_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.immunization_records_id_seq', 1, false);


--
-- Name: immunization_schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.immunization_schedules_id_seq', 1, false);


--
-- Name: inventory_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_items_id_seq', 1, false);


--
-- Name: item_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.item_types_id_seq', 1, false);


--
-- Name: items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.items_id_seq', 1, false);


--
-- Name: leave_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leave_requests_id_seq', 2, true);


--
-- Name: leave_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leave_types_id_seq', 5, true);


--
-- Name: medicines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.medicines_id_seq', 1, false);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 3, true);


--
-- Name: patients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.patients_id_seq', 1, false);


--
-- Name: payslips_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payslips_id_seq', 1, false);


--
-- Name: po_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.po_items_id_seq', 1, false);


--
-- Name: po_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.po_payments_id_seq', 1, false);


--
-- Name: prescription_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.prescription_lines_id_seq', 1, false);


--
-- Name: prescriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.prescriptions_id_seq', 1, false);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchase_orders_id_seq', 1, false);


--
-- Name: rosters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rosters_id_seq', 1, true);


--
-- Name: service_catalog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.service_catalog_id_seq', 59, true);


--
-- Name: service_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.service_categories_id_seq', 13, true);


--
-- Name: shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shifts_id_seq', 8, true);


--
-- Name: staff_departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.staff_departments_id_seq', 107, true);


--
-- Name: staff_hr_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.staff_hr_profiles_id_seq', 107, true);


--
-- Name: staff_salaries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.staff_salaries_id_seq', 107, true);


--
-- Name: staff_supervisors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.staff_supervisors_id_seq', 18, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 1, false);


--
-- Name: vendors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vendors_id_seq', 1, false);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: banks banks_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT banks_name_unique UNIQUE (name);


--
-- Name: banks banks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT banks_pkey PRIMARY KEY (id);


--
-- Name: biometric_mappings biometric_mappings_biometric_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biometric_mappings
    ADD CONSTRAINT biometric_mappings_biometric_code_unique UNIQUE (biometric_code);


--
-- Name: biometric_mappings biometric_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biometric_mappings
    ADD CONSTRAINT biometric_mappings_pkey PRIMARY KEY (id);


--
-- Name: biometric_mappings biometric_mappings_staff_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biometric_mappings
    ADD CONSTRAINT biometric_mappings_staff_id_unique UNIQUE (staff_id);


--
-- Name: consultant_rates consultant_rates_doctor_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultant_rates
    ADD CONSTRAINT consultant_rates_doctor_id_unique UNIQUE (doctor_id);


--
-- Name: consultant_rates consultant_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultant_rates
    ADD CONSTRAINT consultant_rates_pkey PRIMARY KEY (id);


--
-- Name: daily_additional_income daily_additional_income_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_additional_income
    ADD CONSTRAINT daily_additional_income_pkey PRIMARY KEY (id);


--
-- Name: daily_closing_reports daily_closing_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_closing_reports
    ADD CONSTRAINT daily_closing_reports_pkey PRIMARY KEY (id);


--
-- Name: daily_closing_reports daily_closing_reports_report_date_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_closing_reports
    ADD CONSTRAINT daily_closing_reports_report_date_unique UNIQUE (report_date);


--
-- Name: daily_discounts_returns daily_discounts_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_discounts_returns
    ADD CONSTRAINT daily_discounts_returns_pkey PRIMARY KEY (id);


--
-- Name: daily_expenditures daily_expenditures_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_expenditures
    ADD CONSTRAINT daily_expenditures_pkey PRIMARY KEY (id);


--
-- Name: daily_ipd_admissions daily_ipd_admissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_ipd_admissions
    ADD CONSTRAINT daily_ipd_admissions_pkey PRIMARY KEY (id);


--
-- Name: daily_ipd_discharges daily_ipd_discharges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_ipd_discharges
    ADD CONSTRAINT daily_ipd_discharges_pkey PRIMARY KEY (id);


--
-- Name: daily_payment_channels daily_payment_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_payment_channels
    ADD CONSTRAINT daily_payment_channels_pkey PRIMARY KEY (id);


--
-- Name: daily_pharmacy_income daily_pharmacy_income_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_pharmacy_income
    ADD CONSTRAINT daily_pharmacy_income_pkey PRIMARY KEY (id);


--
-- Name: daily_pharmacy_income daily_pharmacy_income_report_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_pharmacy_income
    ADD CONSTRAINT daily_pharmacy_income_report_id_unique UNIQUE (report_id);


--
-- Name: daily_service_lines daily_service_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_service_lines
    ADD CONSTRAINT daily_service_lines_pkey PRIMARY KEY (id);


--
-- Name: daily_staff_advances daily_staff_advances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_staff_advances
    ADD CONSTRAINT daily_staff_advances_pkey PRIMARY KEY (id);


--
-- Name: department_leaders department_leaders_department_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_leaders
    ADD CONSTRAINT department_leaders_department_id_unique UNIQUE (department_id);


--
-- Name: department_leaders department_leaders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_leaders
    ADD CONSTRAINT department_leaders_pkey PRIMARY KEY (id);


--
-- Name: departments departments_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_unique UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: designations designations_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_name_unique UNIQUE (name);


--
-- Name: designations designations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_pkey PRIMARY KEY (id);


--
-- Name: encounters encounters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_pkey PRIMARY KEY (id);


--
-- Name: expense_catalog expense_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_catalog
    ADD CONSTRAINT expense_catalog_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_code_unique UNIQUE (code);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: grn_items grn_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_pkey PRIMARY KEY (id);


--
-- Name: grns grns_grn_no_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grns
    ADD CONSTRAINT grns_grn_no_unique UNIQUE (grn_no);


--
-- Name: grns grns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grns
    ADD CONSTRAINT grns_pkey PRIMARY KEY (id);


--
-- Name: immunization_records immunization_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.immunization_records
    ADD CONSTRAINT immunization_records_pkey PRIMARY KEY (id);


--
-- Name: immunization_schedules immunization_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.immunization_schedules
    ADD CONSTRAINT immunization_schedules_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_sku_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_sku_unique UNIQUE (sku);


--
-- Name: item_types item_types_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_types
    ADD CONSTRAINT item_types_name_unique UNIQUE (name);


--
-- Name: item_types item_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_types
    ADD CONSTRAINT item_types_pkey PRIMARY KEY (id);


--
-- Name: items items_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_name_unique UNIQUE (name);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_request_no_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_request_no_unique UNIQUE (request_no);


--
-- Name: leave_types leave_types_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_name_unique UNIQUE (name);


--
-- Name: leave_types leave_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_pkey PRIMARY KEY (id);


--
-- Name: medicines medicines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medicines
    ADD CONSTRAINT medicines_pkey PRIMARY KEY (id);


--
-- Name: medicines medicines_sku_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medicines
    ADD CONSTRAINT medicines_sku_unique UNIQUE (sku);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: patients patients_mrn_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_mrn_unique UNIQUE (mrn);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: payslips payslips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT payslips_pkey PRIMARY KEY (id);


--
-- Name: po_items po_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_items
    ADD CONSTRAINT po_items_pkey PRIMARY KEY (id);


--
-- Name: po_payments po_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_payments
    ADD CONSTRAINT po_payments_pkey PRIMARY KEY (id);


--
-- Name: prescription_lines prescription_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescription_lines
    ADD CONSTRAINT prescription_lines_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_po_no_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_po_no_unique UNIQUE (po_no);


--
-- Name: rosters rosters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rosters
    ADD CONSTRAINT rosters_pkey PRIMARY KEY (id);


--
-- Name: service_catalog service_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_catalog
    ADD CONSTRAINT service_catalog_pkey PRIMARY KEY (id);


--
-- Name: service_categories service_categories_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_code_unique UNIQUE (code);


--
-- Name: service_categories service_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_unique UNIQUE (token);


--
-- Name: shifts shifts_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_name_unique UNIQUE (name);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: staff_departments staff_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_departments
    ADD CONSTRAINT staff_departments_pkey PRIMARY KEY (id);


--
-- Name: staff_hr_profiles staff_hr_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_hr_profiles
    ADD CONSTRAINT staff_hr_profiles_pkey PRIMARY KEY (id);


--
-- Name: staff_hr_profiles staff_hr_profiles_staff_id_version_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_hr_profiles
    ADD CONSTRAINT staff_hr_profiles_staff_id_version_unique UNIQUE (staff_id, staff_version);


--
-- Name: staff_salaries staff_salaries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_salaries
    ADD CONSTRAINT staff_salaries_pkey PRIMARY KEY (id);


--
-- Name: staff_salaries staff_salaries_staff_id_version_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_salaries
    ADD CONSTRAINT staff_salaries_staff_id_version_unique UNIQUE (staff_id, staff_version);


--
-- Name: staff staff_staff_id_version_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_staff_id_version_pk PRIMARY KEY (staff_id, version);


--
-- Name: staff_supervisors staff_supervisors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_supervisors
    ADD CONSTRAINT staff_supervisors_pkey PRIMARY KEY (id);


--
-- Name: staff_supervisors staff_supervisors_staff_id_version_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_supervisors
    ADD CONSTRAINT staff_supervisors_staff_id_version_unique UNIQUE (staff_id, staff_version);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user user_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_unique UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_name_unique UNIQUE (name);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: account account_userId_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: appointments appointments_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: daily_additional_income daily_additional_income_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_additional_income
    ADD CONSTRAINT daily_additional_income_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: daily_closing_reports daily_closing_reports_created_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_closing_reports
    ADD CONSTRAINT daily_closing_reports_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: daily_discounts_returns daily_discounts_returns_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_discounts_returns
    ADD CONSTRAINT daily_discounts_returns_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: daily_expenditures daily_expenditures_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_expenditures
    ADD CONSTRAINT daily_expenditures_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: daily_ipd_admissions daily_ipd_admissions_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_ipd_admissions
    ADD CONSTRAINT daily_ipd_admissions_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: daily_ipd_discharges daily_ipd_discharges_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_ipd_discharges
    ADD CONSTRAINT daily_ipd_discharges_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: daily_payment_channels daily_payment_channels_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_payment_channels
    ADD CONSTRAINT daily_payment_channels_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: daily_pharmacy_income daily_pharmacy_income_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_pharmacy_income
    ADD CONSTRAINT daily_pharmacy_income_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: daily_service_lines daily_service_lines_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_service_lines
    ADD CONSTRAINT daily_service_lines_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: daily_service_lines daily_service_lines_service_id_service_catalog_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_service_lines
    ADD CONSTRAINT daily_service_lines_service_id_service_catalog_id_fk FOREIGN KEY (service_id) REFERENCES public.service_catalog(id) ON DELETE SET NULL;


--
-- Name: daily_staff_advances daily_staff_advances_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_staff_advances
    ADD CONSTRAINT daily_staff_advances_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: department_leaders department_leaders_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_leaders
    ADD CONSTRAINT department_leaders_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: encounters encounters_appointment_id_appointments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_appointment_id_appointments_id_fk FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: grn_items grn_items_grn_id_grns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_grn_id_grns_id_fk FOREIGN KEY (grn_id) REFERENCES public.grns(id) ON DELETE CASCADE;


--
-- Name: grn_items grn_items_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: grn_items grn_items_po_item_id_po_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_po_item_id_po_items_id_fk FOREIGN KEY (po_item_id) REFERENCES public.po_items(id);


--
-- Name: grns grns_created_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grns
    ADD CONSTRAINT grns_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: grns grns_po_id_purchase_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grns
    ADD CONSTRAINT grns_po_id_purchase_orders_id_fk FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: grns grns_vendor_id_vendors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grns
    ADD CONSTRAINT grns_vendor_id_vendors_id_fk FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: immunization_records immunization_records_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.immunization_records
    ADD CONSTRAINT immunization_records_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: immunization_records immunization_records_schedule_id_immunization_schedules_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.immunization_records
    ADD CONSTRAINT immunization_records_schedule_id_immunization_schedules_id_fk FOREIGN KEY (schedule_id) REFERENCES public.immunization_schedules(id) ON DELETE SET NULL;


--
-- Name: items items_item_type_id_item_types_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_item_type_id_item_types_id_fk FOREIGN KEY (item_type_id) REFERENCES public.item_types(id);


--
-- Name: messages messages_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: messages messages_receiver_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_id_user_id_fk FOREIGN KEY (receiver_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_user_id_fk FOREIGN KEY (sender_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: po_items po_items_po_id_purchase_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_items
    ADD CONSTRAINT po_items_po_id_purchase_orders_id_fk FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: po_payments po_payments_created_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_payments
    ADD CONSTRAINT po_payments_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: po_payments po_payments_po_id_purchase_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.po_payments
    ADD CONSTRAINT po_payments_po_id_purchase_orders_id_fk FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: prescription_lines prescription_lines_medicine_id_medicines_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescription_lines
    ADD CONSTRAINT prescription_lines_medicine_id_medicines_id_fk FOREIGN KEY (medicine_id) REFERENCES public.medicines(id);


--
-- Name: prescription_lines prescription_lines_prescription_id_prescriptions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescription_lines
    ADD CONSTRAINT prescription_lines_prescription_id_prescriptions_id_fk FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: prescriptions prescriptions_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: purchase_orders purchase_orders_created_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: purchase_orders purchase_orders_vendor_id_vendors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_vendor_id_vendors_id_fk FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: rosters rosters_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rosters
    ADD CONSTRAINT rosters_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: rosters rosters_shift_id_shifts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rosters
    ADD CONSTRAINT rosters_shift_id_shifts_id_fk FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: session session_userId_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: staff_departments staff_departments_changed_by_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_departments
    ADD CONSTRAINT staff_departments_changed_by_id_user_id_fk FOREIGN KEY (changed_by_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: staff_departments staff_departments_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_departments
    ADD CONSTRAINT staff_departments_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: staff_departments staff_departments_staff_id_staff_version_staff_staff_id_version; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_departments
    ADD CONSTRAINT staff_departments_staff_id_staff_version_staff_staff_id_version FOREIGN KEY (staff_id, staff_version) REFERENCES public.staff(staff_id, version) ON DELETE CASCADE;


--
-- Name: staff_hr_profiles staff_hr_profiles_staff_id_staff_version_staff_staff_id_version; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_hr_profiles
    ADD CONSTRAINT staff_hr_profiles_staff_id_staff_version_staff_staff_id_version FOREIGN KEY (staff_id, staff_version) REFERENCES public.staff(staff_id, version) ON DELETE CASCADE;


--
-- Name: staff_salaries staff_salaries_staff_id_staff_version_staff_staff_id_version_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_salaries
    ADD CONSTRAINT staff_salaries_staff_id_staff_version_staff_staff_id_version_fk FOREIGN KEY (staff_id, staff_version) REFERENCES public.staff(staff_id, version) ON DELETE CASCADE;


--
-- Name: staff_supervisors staff_supervisors_staff_id_staff_version_staff_staff_id_version; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_supervisors
    ADD CONSTRAINT staff_supervisors_staff_id_staff_version_staff_staff_id_version FOREIGN KEY (staff_id, staff_version) REFERENCES public.staff(staff_id, version) ON DELETE CASCADE;


--
-- Name: staff staff_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict ntQUUX0X8qNmQKhjcE2feqyQmERehY7Fs2cJt19uca8pAi68g2DhVbfScyqtDF4

