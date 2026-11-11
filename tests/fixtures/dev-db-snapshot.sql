--
-- PostgreSQL database dump
--

\restrict 2rk7AlcX9yTSSkQS0xZwhW4G6IK4Lf6ARK1GkOx7T1RMs5ceFQw4hvCFroOvabs

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

ALTER TABLE IF EXISTS ONLY public.unit_conversions DROP CONSTRAINT IF EXISTS unit_conversions_to_unit_id_unit_types_id_fk;
ALTER TABLE IF EXISTS ONLY public.unit_conversions DROP CONSTRAINT IF EXISTS unit_conversions_from_unit_id_unit_types_id_fk;
ALTER TABLE IF EXISTS ONLY public.staff DROP CONSTRAINT IF EXISTS staff_user_id_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.staff_supervisors DROP CONSTRAINT IF EXISTS staff_supervisors_staff_id_staff_version_staff_staff_id_version;
ALTER TABLE IF EXISTS ONLY public.staff_salaries DROP CONSTRAINT IF EXISTS staff_salaries_staff_id_staff_version_staff_staff_id_version_fk;
ALTER TABLE IF EXISTS ONLY public.staff_off_day_requests DROP CONSTRAINT IF EXISTS staff_off_day_requests_reviewed_by_id_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.staff_hr_profiles DROP CONSTRAINT IF EXISTS staff_hr_profiles_staff_id_staff_version_staff_staff_id_version;
ALTER TABLE IF EXISTS ONLY public.staff_departments DROP CONSTRAINT IF EXISTS staff_departments_staff_id_staff_version_staff_staff_id_version;
ALTER TABLE IF EXISTS ONLY public.staff_departments DROP CONSTRAINT IF EXISTS staff_departments_department_id_departments_id_fk;
ALTER TABLE IF EXISTS ONLY public.staff_departments DROP CONSTRAINT IF EXISTS staff_departments_changed_by_id_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.session DROP CONSTRAINT IF EXISTS "session_userId_user_id_fk";
ALTER TABLE IF EXISTS ONLY public.security_deposit_refunds DROP CONSTRAINT IF EXISTS security_deposit_refunds_processed_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.rosters DROP CONSTRAINT IF EXISTS rosters_shift_id_shifts_id_fk;
ALTER TABLE IF EXISTS ONLY public.rosters DROP CONSTRAINT IF EXISTS rosters_department_id_departments_id_fk;
ALTER TABLE IF EXISTS ONLY public.report_category_exclusions DROP CONSTRAINT IF EXISTS report_category_exclusions_user_id_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_vendor_id_vendors_id_fk;
ALTER TABLE IF EXISTS ONLY public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_created_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_patient_id_patients_id_fk;
ALTER TABLE IF EXISTS ONLY public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_encounter_id_encounters_id_fk;
ALTER TABLE IF EXISTS ONLY public.prescription_lines DROP CONSTRAINT IF EXISTS prescription_lines_prescription_id_prescriptions_id_fk;
ALTER TABLE IF EXISTS ONLY public.prescription_lines DROP CONSTRAINT IF EXISTS prescription_lines_medicine_id_medicines_id_fk;
ALTER TABLE IF EXISTS ONLY public.po_payments DROP CONSTRAINT IF EXISTS po_payments_po_id_purchase_orders_id_fk;
ALTER TABLE IF EXISTS ONLY public.po_payments DROP CONSTRAINT IF EXISTS po_payments_created_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.po_items DROP CONSTRAINT IF EXISTS po_items_unit_id_fkey;
ALTER TABLE IF EXISTS ONLY public.po_items DROP CONSTRAINT IF EXISTS po_items_po_id_purchase_orders_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_subjects DROP CONSTRAINT IF EXISTS nursing_subjects_course_id_nursing_courses_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_students DROP CONSTRAINT IF EXISTS nursing_students_referrer_id_nursing_referrers_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_students DROP CONSTRAINT IF EXISTS nursing_students_batch_id_nursing_batches_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_students DROP CONSTRAINT IF EXISTS nursing_students_applicant_id_nursing_applicants_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_student_fee_frequencies DROP CONSTRAINT IF EXISTS nursing_student_fee_frequencies_student_id_nursing_students_id_;
ALTER TABLE IF EXISTS ONLY public.nursing_student_documents DROP CONSTRAINT IF EXISTS nursing_student_documents_verified_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_student_documents DROP CONSTRAINT IF EXISTS nursing_student_documents_student_id_nursing_students_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_student_documents DROP CONSTRAINT IF EXISTS nursing_student_documents_applicant_id_nursing_applicants_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_referrer_payments DROP CONSTRAINT IF EXISTS nursing_referrer_payments_referrer_id_nursing_referrers_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_referrer_payments DROP CONSTRAINT IF EXISTS nursing_referrer_payments_paid_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_referrer_payment_allocations DROP CONSTRAINT IF EXISTS nursing_referrer_payment_allocations_student_id_nursing_student;
ALTER TABLE IF EXISTS ONLY public.nursing_referrer_payment_allocations DROP CONSTRAINT IF EXISTS nursing_referrer_payment_allocations_payment_id_nursing_referre;
ALTER TABLE IF EXISTS ONLY public.nursing_referrer_payment_allocations DROP CONSTRAINT IF EXISTS nursing_referrer_payment_allocations_applicant_id_nursing_appli;
ALTER TABLE IF EXISTS ONLY public.nursing_fee_transactions DROP CONSTRAINT IF EXISTS nursing_fee_transactions_student_id_nursing_students_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_fee_transactions DROP CONSTRAINT IF EXISTS nursing_fee_transactions_fee_structure_id_nursing_fee_structure;
ALTER TABLE IF EXISTS ONLY public.nursing_fee_transactions DROP CONSTRAINT IF EXISTS nursing_fee_transactions_collected_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_fee_transactions DROP CONSTRAINT IF EXISTS nursing_fee_transactions_applicant_id_nursing_applicants_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_fee_structures DROP CONSTRAINT IF EXISTS nursing_fee_structures_course_id_nursing_courses_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_batches DROP CONSTRAINT IF EXISTS nursing_batches_course_id_nursing_courses_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_audit_logs DROP CONSTRAINT IF EXISTS nursing_audit_logs_changed_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_attendance_records DROP CONSTRAINT IF EXISTS nursing_attendance_records_student_id_nursing_students_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_attendance_records DROP CONSTRAINT IF EXISTS nursing_attendance_records_marked_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_attendance_records DROP CONSTRAINT IF EXISTS nursing_attendance_records_batch_id_nursing_batches_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_applicants DROP CONSTRAINT IF EXISTS nursing_applicants_referrer_id_nursing_referrers_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_applicants DROP CONSTRAINT IF EXISTS nursing_applicants_course_id_nursing_courses_id_fk;
ALTER TABLE IF EXISTS ONLY public.nursing_academic_schedules DROP CONSTRAINT IF EXISTS nursing_academic_schedules_batch_id_nursing_batches_id_fk;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.monthly_bank_expenses DROP CONSTRAINT IF EXISTS monthly_bank_expenses_vendor_id_vendors_id_fk;
ALTER TABLE IF EXISTS ONLY public.monthly_bank_expenses DROP CONSTRAINT IF EXISTS monthly_bank_expenses_created_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_receiver_id_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_department_id_departments_id_fk;
ALTER TABLE IF EXISTS ONLY public.items DROP CONSTRAINT IF EXISTS items_sale_unit_id_fkey;
ALTER TABLE IF EXISTS ONLY public.items DROP CONSTRAINT IF EXISTS items_purchase_unit_id_fkey;
ALTER TABLE IF EXISTS ONLY public.items DROP CONSTRAINT IF EXISTS items_item_type_id_item_types_id_fk;
ALTER TABLE IF EXISTS ONLY public.items DROP CONSTRAINT IF EXISTS items_base_unit_id_fkey;
ALTER TABLE IF EXISTS ONLY public.item_unit_prices DROP CONSTRAINT IF EXISTS item_unit_prices_unit_id_fkey;
ALTER TABLE IF EXISTS ONLY public.item_unit_prices DROP CONSTRAINT IF EXISTS item_unit_prices_item_id_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.immunization_records DROP CONSTRAINT IF EXISTS immunization_records_schedule_id_immunization_schedules_id_fk;
ALTER TABLE IF EXISTS ONLY public.immunization_records DROP CONSTRAINT IF EXISTS immunization_records_patient_id_patients_id_fk;
ALTER TABLE IF EXISTS ONLY public.grns DROP CONSTRAINT IF EXISTS grns_vendor_id_vendors_id_fk;
ALTER TABLE IF EXISTS ONLY public.grns DROP CONSTRAINT IF EXISTS grns_po_id_purchase_orders_id_fk;
ALTER TABLE IF EXISTS ONLY public.grns DROP CONSTRAINT IF EXISTS grns_created_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.grn_items DROP CONSTRAINT IF EXISTS grn_items_unit_id_fkey;
ALTER TABLE IF EXISTS ONLY public.grn_items DROP CONSTRAINT IF EXISTS grn_items_po_item_id_po_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.grn_items DROP CONSTRAINT IF EXISTS grn_items_item_id_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.grn_items DROP CONSTRAINT IF EXISTS grn_items_grn_id_grns_id_fk;
ALTER TABLE IF EXISTS ONLY public.encounters DROP CONSTRAINT IF EXISTS encounters_appointment_id_appointments_id_fk;
ALTER TABLE IF EXISTS ONLY public.department_leaders DROP CONSTRAINT IF EXISTS department_leaders_department_id_departments_id_fk;
ALTER TABLE IF EXISTS ONLY public.daily_staff_advances DROP CONSTRAINT IF EXISTS daily_staff_advances_report_id_daily_closing_reports_id_fk;
ALTER TABLE IF EXISTS ONLY public.daily_service_lines DROP CONSTRAINT IF EXISTS daily_service_lines_service_id_service_catalog_id_fk;
ALTER TABLE IF EXISTS ONLY public.daily_service_lines DROP CONSTRAINT IF EXISTS daily_service_lines_report_id_daily_closing_reports_id_fk;
ALTER TABLE IF EXISTS ONLY public.daily_pharmacy_income DROP CONSTRAINT IF EXISTS daily_pharmacy_income_report_id_daily_closing_reports_id_fk;
ALTER TABLE IF EXISTS ONLY public.daily_payment_channels DROP CONSTRAINT IF EXISTS daily_payment_channels_report_id_daily_closing_reports_id_fk;
ALTER TABLE IF EXISTS ONLY public.daily_ipd_discharges DROP CONSTRAINT IF EXISTS daily_ipd_discharges_report_id_daily_closing_reports_id_fk;
ALTER TABLE IF EXISTS ONLY public.daily_ipd_admissions DROP CONSTRAINT IF EXISTS daily_ipd_admissions_report_id_daily_closing_reports_id_fk;
ALTER TABLE IF EXISTS ONLY public.daily_expenditures DROP CONSTRAINT IF EXISTS daily_expenditures_report_id_daily_closing_reports_id_fk;
ALTER TABLE IF EXISTS ONLY public.daily_discounts_returns DROP CONSTRAINT IF EXISTS daily_discounts_returns_report_id_daily_closing_reports_id_fk;
ALTER TABLE IF EXISTS ONLY public.daily_closing_reports DROP CONSTRAINT IF EXISTS daily_closing_reports_created_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY public.daily_additional_income DROP CONSTRAINT IF EXISTS daily_additional_income_report_id_daily_closing_reports_id_fk;
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS appointments_patient_id_patients_id_fk;
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS appointments_department_id_departments_id_fk;
ALTER TABLE IF EXISTS ONLY public.account DROP CONSTRAINT IF EXISTS "account_userId_user_id_fk";
ALTER TABLE IF EXISTS ONLY inventory.stores DROP CONSTRAINT IF EXISTS stores_department_id_departments_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.store_staff_assignments DROP CONSTRAINT IF EXISTS store_staff_assignments_store_id_stores_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.store_batch_stock DROP CONSTRAINT IF EXISTS store_batch_stock_store_id_stores_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.store_batch_stock DROP CONSTRAINT IF EXISTS store_batch_stock_item_id_items_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.store_batch_stock DROP CONSTRAINT IF EXISTS store_batch_stock_batch_id_item_batches_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_transfers DROP CONSTRAINT IF EXISTS stock_transfers_to_store_id_stores_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_transfers DROP CONSTRAINT IF EXISTS stock_transfers_requisition_id_stock_requisitions_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_transfers DROP CONSTRAINT IF EXISTS stock_transfers_received_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_transfers DROP CONSTRAINT IF EXISTS stock_transfers_from_store_id_stores_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_transfers DROP CONSTRAINT IF EXISTS stock_transfers_dispatched_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_transfer_items DROP CONSTRAINT IF EXISTS stock_transfer_items_transfer_id_stock_transfers_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_transfer_items DROP CONSTRAINT IF EXISTS stock_transfer_items_item_id_items_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_transfer_items DROP CONSTRAINT IF EXISTS stock_transfer_items_batch_id_item_batches_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_requisitions DROP CONSTRAINT IF EXISTS stock_requisitions_requesting_store_id_stores_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_requisitions DROP CONSTRAINT IF EXISTS stock_requisitions_requested_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_requisitions DROP CONSTRAINT IF EXISTS stock_requisitions_fulfilling_store_id_stores_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_requisitions DROP CONSTRAINT IF EXISTS stock_requisitions_approved_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_requisition_items DROP CONSTRAINT IF EXISTS stock_requisition_items_requisition_id_stock_requisitions_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_requisition_items DROP CONSTRAINT IF EXISTS stock_requisition_items_item_id_items_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_ledger DROP CONSTRAINT IF EXISTS stock_ledger_store_id_stores_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_ledger DROP CONSTRAINT IF EXISTS stock_ledger_item_id_items_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_ledger DROP CONSTRAINT IF EXISTS stock_ledger_created_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_ledger DROP CONSTRAINT IF EXISTS stock_ledger_batch_id_item_batches_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_adjustments DROP CONSTRAINT IF EXISTS stock_adjustments_store_id_stores_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_adjustments DROP CONSTRAINT IF EXISTS stock_adjustments_created_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_adjustments DROP CONSTRAINT IF EXISTS stock_adjustments_approved_by_user_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_adjustment_items DROP CONSTRAINT IF EXISTS stock_adjustment_items_item_id_items_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_adjustment_items DROP CONSTRAINT IF EXISTS stock_adjustment_items_batch_id_item_batches_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.stock_adjustment_items DROP CONSTRAINT IF EXISTS stock_adjustment_items_adjustment_id_stock_adjustments_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.sales_returns DROP CONSTRAINT IF EXISTS sales_returns_store_id_stores_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.sales_returns DROP CONSTRAINT IF EXISTS sales_returns_original_invoice_id_sales_invoices_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.sales_returns DROP CONSTRAINT IF EXISTS sales_returns_cashier_id_user_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.sales_return_items DROP CONSTRAINT IF EXISTS sales_return_items_return_id_sales_returns_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.sales_return_items DROP CONSTRAINT IF EXISTS sales_return_items_item_id_items_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.sales_return_items DROP CONSTRAINT IF EXISTS sales_return_items_batch_id_item_batches_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_store_id_stores_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_prescription_id_prescriptions_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_patient_id_patients_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_cashier_id_user_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.sales_invoice_items DROP CONSTRAINT IF EXISTS sales_invoice_items_item_id_items_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.sales_invoice_items DROP CONSTRAINT IF EXISTS sales_invoice_items_invoice_id_sales_invoices_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.sales_invoice_items DROP CONSTRAINT IF EXISTS sales_invoice_items_batch_id_item_batches_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.purchase_invoices DROP CONSTRAINT IF EXISTS purchase_invoices_verified_by_fkey;
ALTER TABLE IF EXISTS ONLY inventory.purchase_invoices DROP CONSTRAINT IF EXISTS purchase_invoices_vendor_id_fkey;
ALTER TABLE IF EXISTS ONLY inventory.purchase_invoices DROP CONSTRAINT IF EXISTS purchase_invoices_po_id_fkey;
ALTER TABLE IF EXISTS ONLY inventory.purchase_invoices DROP CONSTRAINT IF EXISTS purchase_invoices_grn_id_fkey;
ALTER TABLE IF EXISTS ONLY inventory.purchase_invoices DROP CONSTRAINT IF EXISTS purchase_invoices_created_by_fkey;
ALTER TABLE IF EXISTS ONLY inventory.purchase_invoices DROP CONSTRAINT IF EXISTS purchase_invoices_approved_by_fkey;
ALTER TABLE IF EXISTS ONLY inventory.purchase_invoice_payments DROP CONSTRAINT IF EXISTS purchase_invoice_payments_invoice_id_fkey;
ALTER TABLE IF EXISTS ONLY inventory.purchase_invoice_payments DROP CONSTRAINT IF EXISTS purchase_invoice_payments_created_by_fkey;
ALTER TABLE IF EXISTS ONLY inventory.purchase_invoice_items DROP CONSTRAINT IF EXISTS purchase_invoice_items_unit_id_fkey;
ALTER TABLE IF EXISTS ONLY inventory.purchase_invoice_items DROP CONSTRAINT IF EXISTS purchase_invoice_items_item_id_fkey;
ALTER TABLE IF EXISTS ONLY inventory.purchase_invoice_items DROP CONSTRAINT IF EXISTS purchase_invoice_items_invoice_id_fkey;
ALTER TABLE IF EXISTS ONLY inventory.purchase_invoice_items DROP CONSTRAINT IF EXISTS purchase_invoice_items_grn_item_id_fkey;
ALTER TABLE IF EXISTS ONLY inventory.item_batches DROP CONSTRAINT IF EXISTS item_batches_supplier_id_vendors_id_fk;
ALTER TABLE IF EXISTS ONLY inventory.item_batches DROP CONSTRAINT IF EXISTS item_batches_item_id_items_id_fk;
DROP INDEX IF EXISTS public.nursing_student_fee_frequencies_unique_idx;
DROP INDEX IF EXISTS public.nursing_fee_structures_course_year_quota_idx;
ALTER TABLE IF EXISTS ONLY public.verification DROP CONSTRAINT IF EXISTS verification_pkey;
ALTER TABLE IF EXISTS ONLY public.vendors DROP CONSTRAINT IF EXISTS vendors_pkey;
ALTER TABLE IF EXISTS ONLY public.vendors DROP CONSTRAINT IF EXISTS vendors_name_unique;
ALTER TABLE IF EXISTS ONLY public."user" DROP CONSTRAINT IF EXISTS user_pkey;
ALTER TABLE IF EXISTS ONLY public."user" DROP CONSTRAINT IF EXISTS user_email_unique;
ALTER TABLE IF EXISTS ONLY public.unit_types DROP CONSTRAINT IF EXISTS unit_types_pkey;
ALTER TABLE IF EXISTS ONLY public.unit_types DROP CONSTRAINT IF EXISTS unit_types_name_unique;
ALTER TABLE IF EXISTS ONLY public.unit_conversions DROP CONSTRAINT IF EXISTS unit_conversions_pkey;
ALTER TABLE IF EXISTS ONLY public.transactions DROP CONSTRAINT IF EXISTS transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.staff_weekly_off_days DROP CONSTRAINT IF EXISTS staff_weekly_off_days_pkey;
ALTER TABLE IF EXISTS ONLY public.staff_supervisors DROP CONSTRAINT IF EXISTS staff_supervisors_staff_id_version_unique;
ALTER TABLE IF EXISTS ONLY public.staff_supervisors DROP CONSTRAINT IF EXISTS staff_supervisors_pkey;
ALTER TABLE IF EXISTS ONLY public.staff DROP CONSTRAINT IF EXISTS staff_staff_id_version_pk;
ALTER TABLE IF EXISTS ONLY public.staff_salaries DROP CONSTRAINT IF EXISTS staff_salaries_staff_id_version_unique;
ALTER TABLE IF EXISTS ONLY public.staff_salaries DROP CONSTRAINT IF EXISTS staff_salaries_pkey;
ALTER TABLE IF EXISTS ONLY public.staff_off_day_requests DROP CONSTRAINT IF EXISTS staff_off_day_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.staff_hr_profiles DROP CONSTRAINT IF EXISTS staff_hr_profiles_staff_id_version_unique;
ALTER TABLE IF EXISTS ONLY public.staff_hr_profiles DROP CONSTRAINT IF EXISTS staff_hr_profiles_pkey;
ALTER TABLE IF EXISTS ONLY public.staff_departments DROP CONSTRAINT IF EXISTS staff_departments_pkey;
ALTER TABLE IF EXISTS ONLY public.shifts DROP CONSTRAINT IF EXISTS shifts_pkey;
ALTER TABLE IF EXISTS ONLY public.shifts DROP CONSTRAINT IF EXISTS shifts_name_unique;
ALTER TABLE IF EXISTS ONLY public.session DROP CONSTRAINT IF EXISTS session_token_unique;
ALTER TABLE IF EXISTS ONLY public.session DROP CONSTRAINT IF EXISTS session_pkey;
ALTER TABLE IF EXISTS ONLY public.service_categories DROP CONSTRAINT IF EXISTS service_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.service_categories DROP CONSTRAINT IF EXISTS service_categories_code_unique;
ALTER TABLE IF EXISTS ONLY public.service_catalog DROP CONSTRAINT IF EXISTS service_catalog_pkey;
ALTER TABLE IF EXISTS ONLY public.security_deposit_refunds DROP CONSTRAINT IF EXISTS security_deposit_refunds_pkey;
ALTER TABLE IF EXISTS ONLY public.rosters DROP CONSTRAINT IF EXISTS rosters_staff_id_date_unique;
ALTER TABLE IF EXISTS ONLY public.rosters DROP CONSTRAINT IF EXISTS rosters_pkey;
ALTER TABLE IF EXISTS ONLY public.report_category_exclusions DROP CONSTRAINT IF EXISTS report_category_exclusions_user_id_report_type_unique;
ALTER TABLE IF EXISTS ONLY public.report_category_exclusions DROP CONSTRAINT IF EXISTS report_category_exclusions_pkey;
ALTER TABLE IF EXISTS ONLY public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_po_no_unique;
ALTER TABLE IF EXISTS ONLY public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_pkey;
ALTER TABLE IF EXISTS ONLY public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_pkey;
ALTER TABLE IF EXISTS ONLY public.prescription_lines DROP CONSTRAINT IF EXISTS prescription_lines_pkey;
ALTER TABLE IF EXISTS ONLY public.po_payments DROP CONSTRAINT IF EXISTS po_payments_pkey;
ALTER TABLE IF EXISTS ONLY public.po_items DROP CONSTRAINT IF EXISTS po_items_pkey;
ALTER TABLE IF EXISTS ONLY public.payslips DROP CONSTRAINT IF EXISTS payslips_pkey;
ALTER TABLE IF EXISTS ONLY public.patients DROP CONSTRAINT IF EXISTS patients_pkey;
ALTER TABLE IF EXISTS ONLY public.patients DROP CONSTRAINT IF EXISTS patients_mrn_unique;
ALTER TABLE IF EXISTS ONLY public.nursing_supers DROP CONSTRAINT IF EXISTS nursing_supers_pkey;
ALTER TABLE IF EXISTS ONLY public.nursing_subjects DROP CONSTRAINT IF EXISTS nursing_subjects_pkey;
ALTER TABLE IF EXISTS ONLY public.nursing_subjects DROP CONSTRAINT IF EXISTS nursing_subjects_code_unique;
ALTER TABLE IF EXISTS ONLY public.nursing_students DROP CONSTRAINT IF EXISTS nursing_students_pkey;
ALTER TABLE IF EXISTS ONLY public.nursing_students DROP CONSTRAINT IF EXISTS nursing_students_enrollment_no_unique;
ALTER TABLE IF EXISTS ONLY public.nursing_student_fee_frequencies DROP CONSTRAINT IF EXISTS nursing_student_fee_frequencies_pkey;
ALTER TABLE IF EXISTS ONLY public.nursing_student_documents DROP CONSTRAINT IF EXISTS nursing_student_documents_pkey;
ALTER TABLE IF EXISTS ONLY public.nursing_referrers DROP CONSTRAINT IF EXISTS nursing_referrers_pkey;
ALTER TABLE IF EXISTS ONLY public.nursing_referrer_payments DROP CONSTRAINT IF EXISTS nursing_referrer_payments_voucher_no_unique;
ALTER TABLE IF EXISTS ONLY public.nursing_referrer_payments DROP CONSTRAINT IF EXISTS nursing_referrer_payments_pkey;
ALTER TABLE IF EXISTS ONLY public.nursing_referrer_payment_allocations DROP CONSTRAINT IF EXISTS nursing_referrer_payment_allocations_pkey;
ALTER TABLE IF EXISTS ONLY public.nursing_fee_transactions DROP CONSTRAINT IF EXISTS nursing_fee_transactions_receipt_number_unique;
ALTER TABLE IF EXISTS ONLY public.nursing_fee_transactions DROP CONSTRAINT IF EXISTS nursing_fee_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.nursing_fee_structures DROP CONSTRAINT IF EXISTS nursing_fee_structures_pkey;
ALTER TABLE IF EXISTS ONLY public.nursing_courses DROP CONSTRAINT IF EXISTS nursing_courses_pkey;
ALTER TABLE IF EXISTS ONLY public.nursing_courses DROP CONSTRAINT IF EXISTS nursing_courses_code_unique;
ALTER TABLE IF EXISTS ONLY public.nursing_batches DROP CONSTRAINT IF EXISTS nursing_batches_pkey;
ALTER TABLE IF EXISTS ONLY public.nursing_audit_logs DROP CONSTRAINT IF EXISTS nursing_audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.nursing_attendance_records DROP CONSTRAINT IF EXISTS nursing_attendance_records_pkey;
ALTER TABLE IF EXISTS ONLY public.nursing_applicants DROP CONSTRAINT IF EXISTS nursing_applicants_pkey;
ALTER TABLE IF EXISTS ONLY public.nursing_applicants DROP CONSTRAINT IF EXISTS nursing_applicants_application_no_unique;
ALTER TABLE IF EXISTS ONLY public.nursing_academic_schedules DROP CONSTRAINT IF EXISTS nursing_academic_schedules_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.monthly_bank_expenses DROP CONSTRAINT IF EXISTS monthly_bank_expenses_pkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.medicines DROP CONSTRAINT IF EXISTS medicines_sku_unique;
ALTER TABLE IF EXISTS ONLY public.medicines DROP CONSTRAINT IF EXISTS medicines_pkey;
ALTER TABLE IF EXISTS ONLY public.management_approvers DROP CONSTRAINT IF EXISTS management_approvers_pkey;
ALTER TABLE IF EXISTS ONLY public.leave_types DROP CONSTRAINT IF EXISTS leave_types_pkey;
ALTER TABLE IF EXISTS ONLY public.leave_types DROP CONSTRAINT IF EXISTS leave_types_name_unique;
ALTER TABLE IF EXISTS ONLY public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_request_no_unique;
ALTER TABLE IF EXISTS ONLY public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.items DROP CONSTRAINT IF EXISTS items_pkey;
ALTER TABLE IF EXISTS ONLY public.items DROP CONSTRAINT IF EXISTS items_name_unique;
ALTER TABLE IF EXISTS ONLY public.item_unit_prices DROP CONSTRAINT IF EXISTS item_unit_prices_pkey;
ALTER TABLE IF EXISTS ONLY public.item_types DROP CONSTRAINT IF EXISTS item_types_pkey;
ALTER TABLE IF EXISTS ONLY public.item_types DROP CONSTRAINT IF EXISTS item_types_name_unique;
ALTER TABLE IF EXISTS ONLY public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_sku_unique;
ALTER TABLE IF EXISTS ONLY public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_pkey;
ALTER TABLE IF EXISTS ONLY public.immunization_schedules DROP CONSTRAINT IF EXISTS immunization_schedules_pkey;
ALTER TABLE IF EXISTS ONLY public.immunization_records DROP CONSTRAINT IF EXISTS immunization_records_pkey;
ALTER TABLE IF EXISTS ONLY public.grns DROP CONSTRAINT IF EXISTS grns_pkey;
ALTER TABLE IF EXISTS ONLY public.grns DROP CONSTRAINT IF EXISTS grns_grn_no_unique;
ALTER TABLE IF EXISTS ONLY public.grn_items DROP CONSTRAINT IF EXISTS grn_items_pkey;
ALTER TABLE IF EXISTS ONLY public.expense_categories DROP CONSTRAINT IF EXISTS expense_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.expense_categories DROP CONSTRAINT IF EXISTS expense_categories_code_unique;
ALTER TABLE IF EXISTS ONLY public.expense_catalog DROP CONSTRAINT IF EXISTS expense_catalog_pkey;
ALTER TABLE IF EXISTS ONLY public.encounters DROP CONSTRAINT IF EXISTS encounters_pkey;
ALTER TABLE IF EXISTS ONLY public.designations DROP CONSTRAINT IF EXISTS designations_pkey;
ALTER TABLE IF EXISTS ONLY public.designations DROP CONSTRAINT IF EXISTS designations_name_unique;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_pkey;
ALTER TABLE IF EXISTS ONLY public.departments DROP CONSTRAINT IF EXISTS departments_name_unique;
ALTER TABLE IF EXISTS ONLY public.department_leaders DROP CONSTRAINT IF EXISTS department_leaders_pkey;
ALTER TABLE IF EXISTS ONLY public.department_leaders DROP CONSTRAINT IF EXISTS department_leaders_department_id_unique;
ALTER TABLE IF EXISTS ONLY public.daily_staff_advances DROP CONSTRAINT IF EXISTS daily_staff_advances_pkey;
ALTER TABLE IF EXISTS ONLY public.daily_service_lines DROP CONSTRAINT IF EXISTS daily_service_lines_pkey;
ALTER TABLE IF EXISTS ONLY public.daily_pharmacy_income DROP CONSTRAINT IF EXISTS daily_pharmacy_income_report_id_unique;
ALTER TABLE IF EXISTS ONLY public.daily_pharmacy_income DROP CONSTRAINT IF EXISTS daily_pharmacy_income_pkey;
ALTER TABLE IF EXISTS ONLY public.daily_payment_channels DROP CONSTRAINT IF EXISTS daily_payment_channels_pkey;
ALTER TABLE IF EXISTS ONLY public.daily_ipd_discharges DROP CONSTRAINT IF EXISTS daily_ipd_discharges_pkey;
ALTER TABLE IF EXISTS ONLY public.daily_ipd_admissions DROP CONSTRAINT IF EXISTS daily_ipd_admissions_pkey;
ALTER TABLE IF EXISTS ONLY public.daily_expenditures DROP CONSTRAINT IF EXISTS daily_expenditures_pkey;
ALTER TABLE IF EXISTS ONLY public.daily_discounts_returns DROP CONSTRAINT IF EXISTS daily_discounts_returns_pkey;
ALTER TABLE IF EXISTS ONLY public.daily_closing_reports DROP CONSTRAINT IF EXISTS daily_closing_reports_report_date_unique;
ALTER TABLE IF EXISTS ONLY public.daily_closing_reports DROP CONSTRAINT IF EXISTS daily_closing_reports_pkey;
ALTER TABLE IF EXISTS ONLY public.daily_additional_income DROP CONSTRAINT IF EXISTS daily_additional_income_pkey;
ALTER TABLE IF EXISTS ONLY public.consultant_rates DROP CONSTRAINT IF EXISTS consultant_rates_pkey;
ALTER TABLE IF EXISTS ONLY public.consultant_rates DROP CONSTRAINT IF EXISTS consultant_rates_doctor_id_unique;
ALTER TABLE IF EXISTS ONLY public.biometric_mappings DROP CONSTRAINT IF EXISTS biometric_mappings_staff_id_unique;
ALTER TABLE IF EXISTS ONLY public.biometric_mappings DROP CONSTRAINT IF EXISTS biometric_mappings_pkey;
ALTER TABLE IF EXISTS ONLY public.biometric_mappings DROP CONSTRAINT IF EXISTS biometric_mappings_biometric_code_unique;
ALTER TABLE IF EXISTS ONLY public.banks DROP CONSTRAINT IF EXISTS banks_pkey;
ALTER TABLE IF EXISTS ONLY public.banks DROP CONSTRAINT IF EXISTS banks_name_unique;
ALTER TABLE IF EXISTS ONLY public.bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_pkey;
ALTER TABLE IF EXISTS ONLY public.attendance DROP CONSTRAINT IF EXISTS attendance_pkey;
ALTER TABLE IF EXISTS ONLY public.appointments DROP CONSTRAINT IF EXISTS appointments_pkey;
ALTER TABLE IF EXISTS ONLY public.account DROP CONSTRAINT IF EXISTS account_pkey;
ALTER TABLE IF EXISTS ONLY inventory.stores DROP CONSTRAINT IF EXISTS stores_pkey;
ALTER TABLE IF EXISTS ONLY inventory.stores DROP CONSTRAINT IF EXISTS stores_code_unique;
ALTER TABLE IF EXISTS ONLY inventory.store_staff_assignments DROP CONSTRAINT IF EXISTS store_staff_assignments_pkey;
ALTER TABLE IF EXISTS ONLY inventory.store_batch_stock DROP CONSTRAINT IF EXISTS store_batch_stock_store_id_batch_id_unique;
ALTER TABLE IF EXISTS ONLY inventory.store_batch_stock DROP CONSTRAINT IF EXISTS store_batch_stock_pkey;
ALTER TABLE IF EXISTS ONLY inventory.stock_transfers DROP CONSTRAINT IF EXISTS stock_transfers_transfer_no_unique;
ALTER TABLE IF EXISTS ONLY inventory.stock_transfers DROP CONSTRAINT IF EXISTS stock_transfers_pkey;
ALTER TABLE IF EXISTS ONLY inventory.stock_transfer_items DROP CONSTRAINT IF EXISTS stock_transfer_items_pkey;
ALTER TABLE IF EXISTS ONLY inventory.stock_requisitions DROP CONSTRAINT IF EXISTS stock_requisitions_requisition_no_unique;
ALTER TABLE IF EXISTS ONLY inventory.stock_requisitions DROP CONSTRAINT IF EXISTS stock_requisitions_pkey;
ALTER TABLE IF EXISTS ONLY inventory.stock_requisition_items DROP CONSTRAINT IF EXISTS stock_requisition_items_pkey;
ALTER TABLE IF EXISTS ONLY inventory.stock_ledger DROP CONSTRAINT IF EXISTS stock_ledger_pkey;
ALTER TABLE IF EXISTS ONLY inventory.stock_adjustments DROP CONSTRAINT IF EXISTS stock_adjustments_pkey;
ALTER TABLE IF EXISTS ONLY inventory.stock_adjustments DROP CONSTRAINT IF EXISTS stock_adjustments_adjustment_no_unique;
ALTER TABLE IF EXISTS ONLY inventory.stock_adjustment_items DROP CONSTRAINT IF EXISTS stock_adjustment_items_pkey;
ALTER TABLE IF EXISTS ONLY inventory.sales_returns DROP CONSTRAINT IF EXISTS sales_returns_return_no_unique;
ALTER TABLE IF EXISTS ONLY inventory.sales_returns DROP CONSTRAINT IF EXISTS sales_returns_pkey;
ALTER TABLE IF EXISTS ONLY inventory.sales_return_items DROP CONSTRAINT IF EXISTS sales_return_items_pkey;
ALTER TABLE IF EXISTS ONLY inventory.sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_pkey;
ALTER TABLE IF EXISTS ONLY inventory.sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_invoice_no_unique;
ALTER TABLE IF EXISTS ONLY inventory.sales_invoice_items DROP CONSTRAINT IF EXISTS sales_invoice_items_pkey;
ALTER TABLE IF EXISTS ONLY inventory.purchase_invoices DROP CONSTRAINT IF EXISTS purchase_invoices_pkey;
ALTER TABLE IF EXISTS ONLY inventory.purchase_invoice_payments DROP CONSTRAINT IF EXISTS purchase_invoice_payments_pkey;
ALTER TABLE IF EXISTS ONLY inventory.purchase_invoice_items DROP CONSTRAINT IF EXISTS purchase_invoice_items_pkey;
ALTER TABLE IF EXISTS ONLY inventory.item_batches DROP CONSTRAINT IF EXISTS item_batches_pkey;
ALTER TABLE IF EXISTS ONLY inventory.item_batches DROP CONSTRAINT IF EXISTS item_batches_item_id_batch_number_unique;
ALTER TABLE IF EXISTS ONLY inventory.document_sequences DROP CONSTRAINT IF EXISTS document_sequences_pkey;
ALTER TABLE IF EXISTS ONLY inventory.document_sequences DROP CONSTRAINT IF EXISTS document_sequences_code_financial_year_unique;
ALTER TABLE IF EXISTS public.vendors ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.unit_types ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.unit_conversions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.transactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.staff_weekly_off_days ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.staff_supervisors ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.staff_salaries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.staff_off_day_requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.staff_hr_profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.staff_departments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.shifts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.service_categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.service_catalog ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.security_deposit_refunds ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.rosters ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.report_category_exclusions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.purchase_orders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.prescriptions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.prescription_lines ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.po_payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.po_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.payslips ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.patients ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.nursing_supers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.nursing_subjects ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.nursing_students ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.nursing_student_fee_frequencies ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.nursing_student_documents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.nursing_referrers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.nursing_referrer_payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.nursing_referrer_payment_allocations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.nursing_fee_transactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.nursing_fee_structures ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.nursing_courses ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.nursing_batches ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.nursing_audit_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.nursing_attendance_records ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.nursing_applicants ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.nursing_academic_schedules ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.monthly_bank_expenses ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.messages ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.medicines ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.management_approvers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.leave_types ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.leave_requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.item_unit_prices ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.item_types ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.inventory_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.immunization_schedules ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.immunization_records ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.grns ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.grn_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.expense_categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.expense_catalog ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.encounters ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.designations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.departments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.department_leaders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.daily_staff_advances ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.daily_service_lines ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.daily_pharmacy_income ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.daily_payment_channels ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.daily_ipd_discharges ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.daily_ipd_admissions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.daily_expenditures ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.daily_discounts_returns ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.daily_closing_reports ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.daily_additional_income ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.consultant_rates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.biometric_mappings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.banks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.bank_accounts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.attendance ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.appointments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.stores ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.store_staff_assignments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.store_batch_stock ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.stock_transfers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.stock_transfer_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.stock_requisitions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.stock_requisition_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.stock_ledger ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.stock_adjustments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.stock_adjustment_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.sales_returns ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.sales_return_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.sales_invoices ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.sales_invoice_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.purchase_invoices ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.purchase_invoice_payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.purchase_invoice_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.item_batches ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS inventory.document_sequences ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.verification;
DROP SEQUENCE IF EXISTS public.vendors_id_seq;
DROP TABLE IF EXISTS public.vendors;
DROP TABLE IF EXISTS public."user";
DROP SEQUENCE IF EXISTS public.unit_types_id_seq;
DROP TABLE IF EXISTS public.unit_types;
DROP SEQUENCE IF EXISTS public.unit_conversions_id_seq;
DROP TABLE IF EXISTS public.unit_conversions;
DROP SEQUENCE IF EXISTS public.transactions_id_seq;
DROP TABLE IF EXISTS public.transactions;
DROP SEQUENCE IF EXISTS public.staff_weekly_off_days_id_seq;
DROP TABLE IF EXISTS public.staff_weekly_off_days;
DROP SEQUENCE IF EXISTS public.staff_supervisors_id_seq;
DROP TABLE IF EXISTS public.staff_supervisors;
DROP SEQUENCE IF EXISTS public.staff_salaries_id_seq;
DROP TABLE IF EXISTS public.staff_salaries;
DROP SEQUENCE IF EXISTS public.staff_off_day_requests_id_seq;
DROP TABLE IF EXISTS public.staff_off_day_requests;
DROP SEQUENCE IF EXISTS public.staff_hr_profiles_id_seq;
DROP TABLE IF EXISTS public.staff_hr_profiles;
DROP SEQUENCE IF EXISTS public.staff_departments_id_seq;
DROP TABLE IF EXISTS public.staff_departments;
DROP TABLE IF EXISTS public.staff;
DROP SEQUENCE IF EXISTS public.shifts_id_seq;
DROP TABLE IF EXISTS public.shifts;
DROP TABLE IF EXISTS public.session;
DROP SEQUENCE IF EXISTS public.service_categories_id_seq;
DROP TABLE IF EXISTS public.service_categories;
DROP SEQUENCE IF EXISTS public.service_catalog_id_seq;
DROP TABLE IF EXISTS public.service_catalog;
DROP SEQUENCE IF EXISTS public.security_deposit_refunds_id_seq;
DROP TABLE IF EXISTS public.security_deposit_refunds;
DROP SEQUENCE IF EXISTS public.rosters_id_seq;
DROP TABLE IF EXISTS public.rosters;
DROP SEQUENCE IF EXISTS public.report_category_exclusions_id_seq;
DROP TABLE IF EXISTS public.report_category_exclusions;
DROP SEQUENCE IF EXISTS public.purchase_orders_id_seq;
DROP TABLE IF EXISTS public.purchase_orders;
DROP SEQUENCE IF EXISTS public.prescriptions_id_seq;
DROP TABLE IF EXISTS public.prescriptions;
DROP SEQUENCE IF EXISTS public.prescription_lines_id_seq;
DROP TABLE IF EXISTS public.prescription_lines;
DROP SEQUENCE IF EXISTS public.po_payments_id_seq;
DROP TABLE IF EXISTS public.po_payments;
DROP SEQUENCE IF EXISTS public.po_items_id_seq;
DROP TABLE IF EXISTS public.po_items;
DROP SEQUENCE IF EXISTS public.payslips_id_seq;
DROP TABLE IF EXISTS public.payslips;
DROP SEQUENCE IF EXISTS public.patients_id_seq;
DROP TABLE IF EXISTS public.patients;
DROP SEQUENCE IF EXISTS public.nursing_supers_id_seq;
DROP TABLE IF EXISTS public.nursing_supers;
DROP SEQUENCE IF EXISTS public.nursing_subjects_id_seq;
DROP TABLE IF EXISTS public.nursing_subjects;
DROP SEQUENCE IF EXISTS public.nursing_students_id_seq;
DROP TABLE IF EXISTS public.nursing_students;
DROP SEQUENCE IF EXISTS public.nursing_student_fee_frequencies_id_seq;
DROP TABLE IF EXISTS public.nursing_student_fee_frequencies;
DROP SEQUENCE IF EXISTS public.nursing_student_documents_id_seq;
DROP TABLE IF EXISTS public.nursing_student_documents;
DROP SEQUENCE IF EXISTS public.nursing_referrers_id_seq;
DROP TABLE IF EXISTS public.nursing_referrers;
DROP SEQUENCE IF EXISTS public.nursing_referrer_payments_id_seq;
DROP TABLE IF EXISTS public.nursing_referrer_payments;
DROP SEQUENCE IF EXISTS public.nursing_referrer_payment_allocations_id_seq;
DROP TABLE IF EXISTS public.nursing_referrer_payment_allocations;
DROP SEQUENCE IF EXISTS public.nursing_fee_transactions_id_seq;
DROP TABLE IF EXISTS public.nursing_fee_transactions;
DROP SEQUENCE IF EXISTS public.nursing_fee_structures_id_seq;
DROP TABLE IF EXISTS public.nursing_fee_structures;
DROP SEQUENCE IF EXISTS public.nursing_courses_id_seq;
DROP TABLE IF EXISTS public.nursing_courses;
DROP SEQUENCE IF EXISTS public.nursing_batches_id_seq;
DROP TABLE IF EXISTS public.nursing_batches;
DROP SEQUENCE IF EXISTS public.nursing_audit_logs_id_seq;
DROP TABLE IF EXISTS public.nursing_audit_logs;
DROP SEQUENCE IF EXISTS public.nursing_attendance_records_id_seq;
DROP TABLE IF EXISTS public.nursing_attendance_records;
DROP SEQUENCE IF EXISTS public.nursing_applicants_id_seq;
DROP TABLE IF EXISTS public.nursing_applicants;
DROP SEQUENCE IF EXISTS public.nursing_academic_schedules_id_seq;
DROP TABLE IF EXISTS public.nursing_academic_schedules;
DROP SEQUENCE IF EXISTS public.notifications_id_seq;
DROP TABLE IF EXISTS public.notifications;
DROP SEQUENCE IF EXISTS public.monthly_bank_expenses_id_seq;
DROP TABLE IF EXISTS public.monthly_bank_expenses;
DROP SEQUENCE IF EXISTS public.messages_id_seq;
DROP TABLE IF EXISTS public.messages;
DROP SEQUENCE IF EXISTS public.medicines_id_seq;
DROP TABLE IF EXISTS public.medicines;
DROP SEQUENCE IF EXISTS public.management_approvers_id_seq;
DROP TABLE IF EXISTS public.management_approvers;
DROP SEQUENCE IF EXISTS public.leave_types_id_seq;
DROP TABLE IF EXISTS public.leave_types;
DROP SEQUENCE IF EXISTS public.leave_requests_id_seq;
DROP TABLE IF EXISTS public.leave_requests;
DROP SEQUENCE IF EXISTS public.items_id_seq;
DROP TABLE IF EXISTS public.items;
DROP SEQUENCE IF EXISTS public.item_unit_prices_id_seq;
DROP TABLE IF EXISTS public.item_unit_prices;
DROP SEQUENCE IF EXISTS public.item_types_id_seq;
DROP TABLE IF EXISTS public.item_types;
DROP SEQUENCE IF EXISTS public.inventory_items_id_seq;
DROP TABLE IF EXISTS public.inventory_items;
DROP SEQUENCE IF EXISTS public.immunization_schedules_id_seq;
DROP TABLE IF EXISTS public.immunization_schedules;
DROP SEQUENCE IF EXISTS public.immunization_records_id_seq;
DROP TABLE IF EXISTS public.immunization_records;
DROP SEQUENCE IF EXISTS public.grns_id_seq;
DROP TABLE IF EXISTS public.grns;
DROP SEQUENCE IF EXISTS public.grn_items_id_seq;
DROP TABLE IF EXISTS public.grn_items;
DROP SEQUENCE IF EXISTS public.expense_categories_id_seq;
DROP TABLE IF EXISTS public.expense_categories;
DROP SEQUENCE IF EXISTS public.expense_catalog_id_seq;
DROP TABLE IF EXISTS public.expense_catalog;
DROP SEQUENCE IF EXISTS public.encounters_id_seq;
DROP TABLE IF EXISTS public.encounters;
DROP SEQUENCE IF EXISTS public.designations_id_seq;
DROP TABLE IF EXISTS public.designations;
DROP SEQUENCE IF EXISTS public.departments_id_seq;
DROP TABLE IF EXISTS public.departments;
DROP SEQUENCE IF EXISTS public.department_leaders_id_seq;
DROP TABLE IF EXISTS public.department_leaders;
DROP SEQUENCE IF EXISTS public.daily_staff_advances_id_seq;
DROP TABLE IF EXISTS public.daily_staff_advances;
DROP SEQUENCE IF EXISTS public.daily_service_lines_id_seq;
DROP TABLE IF EXISTS public.daily_service_lines;
DROP SEQUENCE IF EXISTS public.daily_pharmacy_income_id_seq;
DROP TABLE IF EXISTS public.daily_pharmacy_income;
DROP SEQUENCE IF EXISTS public.daily_payment_channels_id_seq;
DROP TABLE IF EXISTS public.daily_payment_channels;
DROP SEQUENCE IF EXISTS public.daily_ipd_discharges_id_seq;
DROP TABLE IF EXISTS public.daily_ipd_discharges;
DROP SEQUENCE IF EXISTS public.daily_ipd_admissions_id_seq;
DROP TABLE IF EXISTS public.daily_ipd_admissions;
DROP SEQUENCE IF EXISTS public.daily_expenditures_id_seq;
DROP TABLE IF EXISTS public.daily_expenditures;
DROP SEQUENCE IF EXISTS public.daily_discounts_returns_id_seq;
DROP TABLE IF EXISTS public.daily_discounts_returns;
DROP SEQUENCE IF EXISTS public.daily_closing_reports_id_seq;
DROP TABLE IF EXISTS public.daily_closing_reports;
DROP SEQUENCE IF EXISTS public.daily_additional_income_id_seq;
DROP TABLE IF EXISTS public.daily_additional_income;
DROP SEQUENCE IF EXISTS public.consultant_rates_id_seq;
DROP TABLE IF EXISTS public.consultant_rates;
DROP SEQUENCE IF EXISTS public.biometric_mappings_id_seq;
DROP TABLE IF EXISTS public.biometric_mappings;
DROP SEQUENCE IF EXISTS public.banks_id_seq;
DROP TABLE IF EXISTS public.banks;
DROP SEQUENCE IF EXISTS public.bank_accounts_id_seq;
DROP TABLE IF EXISTS public.bank_accounts;
DROP SEQUENCE IF EXISTS public.attendance_id_seq;
DROP TABLE IF EXISTS public.attendance;
DROP SEQUENCE IF EXISTS public.appointments_id_seq;
DROP TABLE IF EXISTS public.appointments;
DROP TABLE IF EXISTS public.account;
DROP SEQUENCE IF EXISTS inventory.stores_id_seq;
DROP TABLE IF EXISTS inventory.stores;
DROP SEQUENCE IF EXISTS inventory.store_staff_assignments_id_seq;
DROP TABLE IF EXISTS inventory.store_staff_assignments;
DROP SEQUENCE IF EXISTS inventory.store_batch_stock_id_seq;
DROP TABLE IF EXISTS inventory.store_batch_stock;
DROP SEQUENCE IF EXISTS inventory.stock_transfers_id_seq;
DROP TABLE IF EXISTS inventory.stock_transfers;
DROP SEQUENCE IF EXISTS inventory.stock_transfer_items_id_seq;
DROP TABLE IF EXISTS inventory.stock_transfer_items;
DROP SEQUENCE IF EXISTS inventory.stock_requisitions_id_seq;
DROP TABLE IF EXISTS inventory.stock_requisitions;
DROP SEQUENCE IF EXISTS inventory.stock_requisition_items_id_seq;
DROP TABLE IF EXISTS inventory.stock_requisition_items;
DROP SEQUENCE IF EXISTS inventory.stock_ledger_id_seq;
DROP TABLE IF EXISTS inventory.stock_ledger;
DROP SEQUENCE IF EXISTS inventory.stock_adjustments_id_seq;
DROP TABLE IF EXISTS inventory.stock_adjustments;
DROP SEQUENCE IF EXISTS inventory.stock_adjustment_items_id_seq;
DROP TABLE IF EXISTS inventory.stock_adjustment_items;
DROP SEQUENCE IF EXISTS inventory.sales_returns_id_seq;
DROP TABLE IF EXISTS inventory.sales_returns;
DROP SEQUENCE IF EXISTS inventory.sales_return_items_id_seq;
DROP TABLE IF EXISTS inventory.sales_return_items;
DROP SEQUENCE IF EXISTS inventory.sales_invoices_id_seq;
DROP TABLE IF EXISTS inventory.sales_invoices;
DROP SEQUENCE IF EXISTS inventory.sales_invoice_items_id_seq;
DROP TABLE IF EXISTS inventory.sales_invoice_items;
DROP SEQUENCE IF EXISTS inventory.purchase_invoices_id_seq;
DROP TABLE IF EXISTS inventory.purchase_invoices;
DROP SEQUENCE IF EXISTS inventory.purchase_invoice_payments_id_seq;
DROP TABLE IF EXISTS inventory.purchase_invoice_payments;
DROP SEQUENCE IF EXISTS inventory.purchase_invoice_items_id_seq;
DROP TABLE IF EXISTS inventory.purchase_invoice_items;
DROP SEQUENCE IF EXISTS inventory.item_batches_id_seq;
DROP TABLE IF EXISTS inventory.item_batches;
DROP SEQUENCE IF EXISTS inventory.document_sequences_id_seq;
DROP TABLE IF EXISTS inventory.document_sequences;
DROP TYPE IF EXISTS public.po_status;
DROP TYPE IF EXISTS public.po_payment_status;
DROP TYPE IF EXISTS public.payment_mode;
DROP TYPE IF EXISTS public.grn_status;
DROP TYPE IF EXISTS inventory.transfer_status;
DROP TYPE IF EXISTS inventory.stock_movement_type;
DROP TYPE IF EXISTS inventory.requisition_status;
DROP TYPE IF EXISTS inventory.requisition_priority;
DROP TYPE IF EXISTS inventory.refund_mode;
DROP TYPE IF EXISTS inventory.invoice_status;
DROP TYPE IF EXISTS inventory.invoice_payment_mode;
DROP TYPE IF EXISTS inventory.adjustment_type;
DROP TYPE IF EXISTS inventory.adjustment_status;
DROP SCHEMA IF EXISTS inventory;
--
-- Name: inventory; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA inventory;


--
-- Name: adjustment_status; Type: TYPE; Schema: inventory; Owner: -
--

CREATE TYPE inventory.adjustment_status AS ENUM (
    'draft',
    'posted'
);


--
-- Name: adjustment_type; Type: TYPE; Schema: inventory; Owner: -
--

CREATE TYPE inventory.adjustment_type AS ENUM (
    'gain',
    'loss',
    'expired',
    'damaged'
);


--
-- Name: invoice_payment_mode; Type: TYPE; Schema: inventory; Owner: -
--

CREATE TYPE inventory.invoice_payment_mode AS ENUM (
    'cash',
    'upi',
    'card',
    'credit',
    'mixed'
);


--
-- Name: invoice_status; Type: TYPE; Schema: inventory; Owner: -
--

CREATE TYPE inventory.invoice_status AS ENUM (
    'completed',
    'cancelled',
    'refunded'
);


--
-- Name: refund_mode; Type: TYPE; Schema: inventory; Owner: -
--

CREATE TYPE inventory.refund_mode AS ENUM (
    'cash',
    'upi',
    'credit_note'
);


--
-- Name: requisition_priority; Type: TYPE; Schema: inventory; Owner: -
--

CREATE TYPE inventory.requisition_priority AS ENUM (
    'normal',
    'urgent',
    'emergency'
);


--
-- Name: requisition_status; Type: TYPE; Schema: inventory; Owner: -
--

CREATE TYPE inventory.requisition_status AS ENUM (
    'draft',
    'submitted',
    'approved',
    'partially_fulfilled',
    'fulfilled',
    'rejected'
);


--
-- Name: stock_movement_type; Type: TYPE; Schema: inventory; Owner: -
--

CREATE TYPE inventory.stock_movement_type AS ENUM (
    'GRN',
    'SALE',
    'POS_RETURN',
    'TRANSFER_IN',
    'TRANSFER_OUT',
    'ADJUSTMENT_ADD',
    'ADJUSTMENT_SUB',
    'DAMAGE'
);


--
-- Name: transfer_status; Type: TYPE; Schema: inventory; Owner: -
--

CREATE TYPE inventory.transfer_status AS ENUM (
    'draft',
    'in_transit',
    'received',
    'cancelled'
);


--
-- Name: grn_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.grn_status AS ENUM (
    'draft',
    'posted',
    'correction'
);


--
-- Name: payment_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_mode AS ENUM (
    'cash',
    'upi',
    'card',
    'rtgs',
    'cheque',
    'other'
);


--
-- Name: po_payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.po_payment_status AS ENUM (
    'unpaid',
    'partial',
    'paid'
);


--
-- Name: po_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.po_status AS ENUM (
    'open',
    'partial',
    'closed',
    'cancelled'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: document_sequences; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.document_sequences (
    id integer NOT NULL,
    code text NOT NULL,
    prefix text NOT NULL,
    financial_year text NOT NULL,
    current_val integer DEFAULT 0 NOT NULL,
    padding integer DEFAULT 5 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: document_sequences_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.document_sequences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_sequences_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.document_sequences_id_seq OWNED BY inventory.document_sequences.id;


--
-- Name: item_batches; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.item_batches (
    id integer NOT NULL,
    item_id integer NOT NULL,
    batch_number text NOT NULL,
    mfg_date date,
    expiry_date date NOT NULL,
    mrp numeric(12,2) DEFAULT 0 NOT NULL,
    purchase_rate numeric(12,2) DEFAULT 0 NOT NULL,
    sale_rate numeric(12,2) DEFAULT 0 NOT NULL,
    barcode text,
    supplier_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: item_batches_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.item_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.item_batches_id_seq OWNED BY inventory.item_batches.id;


--
-- Name: purchase_invoice_items; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.purchase_invoice_items (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    item_id integer NOT NULL,
    grn_item_id integer,
    quantity numeric(12,3) NOT NULL,
    unit_id integer NOT NULL,
    unit_rate numeric(12,2) NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0,
    discount_amount numeric(12,2) DEFAULT 0,
    taxable_amount numeric(12,2) NOT NULL,
    hsn_code text,
    gst_percent numeric(5,2) DEFAULT 0 NOT NULL,
    cgst_amount numeric(12,2) DEFAULT 0 NOT NULL,
    sgst_amount numeric(12,2) DEFAULT 0 NOT NULL,
    igst_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) NOT NULL
);


--
-- Name: purchase_invoice_items_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.purchase_invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.purchase_invoice_items_id_seq OWNED BY inventory.purchase_invoice_items.id;


--
-- Name: purchase_invoice_payments; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.purchase_invoice_payments (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    payment_date date NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_mode text NOT NULL,
    reference_no text,
    remarks text,
    created_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: purchase_invoice_payments_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.purchase_invoice_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_invoice_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.purchase_invoice_payments_id_seq OWNED BY inventory.purchase_invoice_payments.id;


--
-- Name: purchase_invoices; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.purchase_invoices (
    id integer NOT NULL,
    invoice_no text NOT NULL,
    invoice_date date NOT NULL,
    vendor_id integer NOT NULL,
    grn_id integer,
    po_id integer,
    status text DEFAULT 'draft'::text NOT NULL,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(12,2) DEFAULT 0 NOT NULL,
    taxable_amount numeric(12,2) DEFAULT 0 NOT NULL,
    cgst_amount numeric(12,2) DEFAULT 0 NOT NULL,
    sgst_amount numeric(12,2) DEFAULT 0 NOT NULL,
    igst_amount numeric(12,2) DEFAULT 0 NOT NULL,
    tds_amount numeric(12,2) DEFAULT 0 NOT NULL,
    round_off numeric(12,2) DEFAULT 0 NOT NULL,
    net_amount numeric(12,2) DEFAULT 0 NOT NULL,
    credit_days integer DEFAULT 0,
    due_date date,
    paid_amount numeric(12,2) DEFAULT 0 NOT NULL,
    remarks text,
    verified_by text,
    approved_by text,
    created_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: purchase_invoices_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.purchase_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.purchase_invoices_id_seq OWNED BY inventory.purchase_invoices.id;


--
-- Name: sales_invoice_items; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.sales_invoice_items (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    item_id integer NOT NULL,
    batch_id integer NOT NULL,
    quantity numeric(12,3) NOT NULL,
    unit text NOT NULL,
    unit_rate numeric(12,2) NOT NULL,
    mrp numeric(12,2) NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0,
    discount_amount numeric(12,2) DEFAULT 0,
    taxable_amount numeric(12,2) NOT NULL,
    gst_percent numeric(5,2) DEFAULT 0 NOT NULL,
    cgst_amount numeric(12,2) DEFAULT 0 NOT NULL,
    sgst_amount numeric(12,2) DEFAULT 0 NOT NULL,
    igst_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) NOT NULL
);


--
-- Name: sales_invoice_items_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.sales_invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.sales_invoice_items_id_seq OWNED BY inventory.sales_invoice_items.id;


--
-- Name: sales_invoices; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.sales_invoices (
    id integer NOT NULL,
    invoice_no text NOT NULL,
    invoice_date timestamp without time zone DEFAULT now() NOT NULL,
    store_id integer NOT NULL,
    patient_id integer,
    customer_name text,
    customer_phone text,
    doctor_name text,
    prescription_id integer,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(12,2) DEFAULT 0 NOT NULL,
    taxable_amount numeric(12,2) DEFAULT 0 NOT NULL,
    cgst_amount numeric(12,2) DEFAULT 0 NOT NULL,
    sgst_amount numeric(12,2) DEFAULT 0 NOT NULL,
    igst_amount numeric(12,2) DEFAULT 0 NOT NULL,
    round_off numeric(12,2) DEFAULT 0 NOT NULL,
    net_amount numeric(12,2) DEFAULT 0 NOT NULL,
    payment_mode inventory.invoice_payment_mode DEFAULT 'cash'::inventory.invoice_payment_mode NOT NULL,
    status inventory.invoice_status DEFAULT 'completed'::inventory.invoice_status NOT NULL,
    cashier_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: sales_invoices_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.sales_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.sales_invoices_id_seq OWNED BY inventory.sales_invoices.id;


--
-- Name: sales_return_items; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.sales_return_items (
    id integer NOT NULL,
    return_id integer NOT NULL,
    item_id integer NOT NULL,
    batch_id integer NOT NULL,
    returned_qty numeric(12,3) NOT NULL,
    unit_rate numeric(12,2) NOT NULL,
    refund_amount numeric(12,2) NOT NULL
);


--
-- Name: sales_return_items_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.sales_return_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_return_items_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.sales_return_items_id_seq OWNED BY inventory.sales_return_items.id;


--
-- Name: sales_returns; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.sales_returns (
    id integer NOT NULL,
    return_no text NOT NULL,
    original_invoice_id integer,
    store_id integer NOT NULL,
    return_date timestamp without time zone DEFAULT now() NOT NULL,
    total_refund_amount numeric(12,2) DEFAULT 0 NOT NULL,
    refund_mode inventory.refund_mode DEFAULT 'cash'::inventory.refund_mode NOT NULL,
    reason text,
    cashier_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: sales_returns_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.sales_returns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_returns_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.sales_returns_id_seq OWNED BY inventory.sales_returns.id;


--
-- Name: stock_adjustment_items; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.stock_adjustment_items (
    id integer NOT NULL,
    adjustment_id integer NOT NULL,
    item_id integer NOT NULL,
    batch_id integer NOT NULL,
    system_qty numeric(12,3) NOT NULL,
    physical_qty numeric(12,3) NOT NULL,
    difference_qty numeric(12,3) NOT NULL,
    type inventory.adjustment_type NOT NULL
);


--
-- Name: stock_adjustment_items_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.stock_adjustment_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_adjustment_items_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.stock_adjustment_items_id_seq OWNED BY inventory.stock_adjustment_items.id;


--
-- Name: stock_adjustments; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.stock_adjustments (
    id integer NOT NULL,
    adjustment_no text NOT NULL,
    store_id integer NOT NULL,
    reason text NOT NULL,
    status inventory.adjustment_status DEFAULT 'draft'::inventory.adjustment_status NOT NULL,
    created_by text,
    approved_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_adjustments_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.stock_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.stock_adjustments_id_seq OWNED BY inventory.stock_adjustments.id;


--
-- Name: stock_ledger; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.stock_ledger (
    id integer NOT NULL,
    transaction_date timestamp without time zone DEFAULT now() NOT NULL,
    store_id integer NOT NULL,
    item_id integer NOT NULL,
    batch_id integer NOT NULL,
    movement_type inventory.stock_movement_type NOT NULL,
    reference_type text NOT NULL,
    reference_id integer NOT NULL,
    quantity_change numeric(12,3) NOT NULL,
    balance_after numeric(12,3) NOT NULL,
    cost_price numeric(12,2) DEFAULT 0 NOT NULL,
    sale_price numeric(12,2) DEFAULT 0 NOT NULL,
    created_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_ledger_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.stock_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.stock_ledger_id_seq OWNED BY inventory.stock_ledger.id;


--
-- Name: stock_requisition_items; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.stock_requisition_items (
    id integer NOT NULL,
    requisition_id integer NOT NULL,
    item_id integer NOT NULL,
    requested_qty numeric(12,3) NOT NULL,
    approved_qty numeric(12,3),
    fulfilled_qty numeric(12,3) DEFAULT 0 NOT NULL,
    unit text NOT NULL
);


--
-- Name: stock_requisition_items_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.stock_requisition_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_requisition_items_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.stock_requisition_items_id_seq OWNED BY inventory.stock_requisition_items.id;


--
-- Name: stock_requisitions; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.stock_requisitions (
    id integer NOT NULL,
    requisition_no text NOT NULL,
    requesting_store_id integer NOT NULL,
    fulfilling_store_id integer NOT NULL,
    status inventory.requisition_status DEFAULT 'draft'::inventory.requisition_status NOT NULL,
    priority inventory.requisition_priority DEFAULT 'normal'::inventory.requisition_priority NOT NULL,
    requested_by text,
    approved_by text,
    remarks text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_requisitions_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.stock_requisitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_requisitions_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.stock_requisitions_id_seq OWNED BY inventory.stock_requisitions.id;


--
-- Name: stock_transfer_items; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.stock_transfer_items (
    id integer NOT NULL,
    transfer_id integer NOT NULL,
    item_id integer NOT NULL,
    batch_id integer NOT NULL,
    quantity numeric(12,3) NOT NULL,
    unit text NOT NULL,
    unit_rate numeric(12,2) DEFAULT 0 NOT NULL
);


--
-- Name: stock_transfer_items_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.stock_transfer_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_transfer_items_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.stock_transfer_items_id_seq OWNED BY inventory.stock_transfer_items.id;


--
-- Name: stock_transfers; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.stock_transfers (
    id integer NOT NULL,
    transfer_no text NOT NULL,
    from_store_id integer NOT NULL,
    to_store_id integer NOT NULL,
    requisition_id integer,
    status inventory.transfer_status DEFAULT 'draft'::inventory.transfer_status NOT NULL,
    dispatched_by text,
    received_by text,
    dispatched_at timestamp without time zone,
    received_at timestamp without time zone,
    remarks text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_transfers_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.stock_transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.stock_transfers_id_seq OWNED BY inventory.stock_transfers.id;


--
-- Name: store_batch_stock; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.store_batch_stock (
    id integer NOT NULL,
    store_id integer NOT NULL,
    item_id integer NOT NULL,
    batch_id integer NOT NULL,
    quantity_on_hand numeric(12,3) DEFAULT 0 NOT NULL,
    allocated_qty numeric(12,3) DEFAULT 0 NOT NULL,
    available_qty numeric(12,3) DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: store_batch_stock_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.store_batch_stock_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: store_batch_stock_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.store_batch_stock_id_seq OWNED BY inventory.store_batch_stock.id;


--
-- Name: store_staff_assignments; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.store_staff_assignments (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    store_id integer NOT NULL,
    can_bill boolean DEFAULT true NOT NULL,
    can_receive boolean DEFAULT true NOT NULL,
    can_transfer boolean DEFAULT true NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: store_staff_assignments_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.store_staff_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: store_staff_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.store_staff_assignments_id_seq OWNED BY inventory.store_staff_assignments.id;


--
-- Name: stores; Type: TABLE; Schema: inventory; Owner: -
--

CREATE TABLE inventory.stores (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    type text DEFAULT 'retail_pharmacy'::text NOT NULL,
    department_id integer,
    location text,
    active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: stores_id_seq; Type: SEQUENCE; Schema: inventory; Owner: -
--

CREATE SEQUENCE inventory.stores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stores_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: -
--

ALTER SEQUENCE inventory.stores_id_seq OWNED BY inventory.stores.id;


--
-- Name: account; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_accounts (
    id integer NOT NULL,
    account_name text NOT NULL,
    bank_name text NOT NULL,
    account_number text NOT NULL,
    ifsc_code text,
    branch_name text,
    account_type text DEFAULT 'Current'::text NOT NULL,
    legal_entity text DEFAULT 'ACME_HOSPITAL'::text NOT NULL,
    opening_balance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bank_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bank_accounts_id_seq OWNED BY public.bank_accounts.id;


--
-- Name: banks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banks (
    id integer NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: banks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.banks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: banks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.banks_id_seq OWNED BY public.banks.id;


--
-- Name: biometric_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.biometric_mappings (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    biometric_code text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: biometric_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.biometric_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: biometric_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.biometric_mappings_id_seq OWNED BY public.biometric_mappings.id;


--
-- Name: consultant_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultant_rates (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    base_rate numeric(12,2) DEFAULT '500'::numeric NOT NULL,
    doctor_share_percent numeric(12,2) DEFAULT '70'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: consultant_rates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.consultant_rates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: consultant_rates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.consultant_rates_id_seq OWNED BY public.consultant_rates.id;


--
-- Name: daily_additional_income; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_additional_income (
    id integer NOT NULL,
    report_id integer NOT NULL,
    label text NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


--
-- Name: daily_additional_income_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_additional_income_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_additional_income_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_additional_income_id_seq OWNED BY public.daily_additional_income.id;


--
-- Name: daily_closing_reports; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: daily_closing_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_closing_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_closing_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_closing_reports_id_seq OWNED BY public.daily_closing_reports.id;


--
-- Name: daily_discounts_returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_discounts_returns (
    id integer NOT NULL,
    report_id integer NOT NULL,
    label text NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


--
-- Name: daily_discounts_returns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_discounts_returns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_discounts_returns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_discounts_returns_id_seq OWNED BY public.daily_discounts_returns.id;


--
-- Name: daily_expenditures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_expenditures (
    id integer NOT NULL,
    report_id integer NOT NULL,
    category text NOT NULL,
    details text NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    narration text
);


--
-- Name: daily_expenditures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_expenditures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_expenditures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_expenditures_id_seq OWNED BY public.daily_expenditures.id;


--
-- Name: daily_ipd_admissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_ipd_admissions (
    id integer NOT NULL,
    report_id integer NOT NULL,
    patient_name text NOT NULL,
    type text NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


--
-- Name: daily_ipd_admissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_ipd_admissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_ipd_admissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_ipd_admissions_id_seq OWNED BY public.daily_ipd_admissions.id;


--
-- Name: daily_ipd_discharges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_ipd_discharges (
    id integer NOT NULL,
    report_id integer NOT NULL,
    patient_name text NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


--
-- Name: daily_ipd_discharges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_ipd_discharges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_ipd_discharges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_ipd_discharges_id_seq OWNED BY public.daily_ipd_discharges.id;


--
-- Name: daily_payment_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_payment_channels (
    id integer NOT NULL,
    report_id integer NOT NULL,
    bank text NOT NULL,
    channel text NOT NULL,
    source_label text NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


--
-- Name: daily_payment_channels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_payment_channels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_payment_channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_payment_channels_id_seq OWNED BY public.daily_payment_channels.id;


--
-- Name: daily_pharmacy_income; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: daily_pharmacy_income_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_pharmacy_income_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_pharmacy_income_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_pharmacy_income_id_seq OWNED BY public.daily_pharmacy_income.id;


--
-- Name: daily_service_lines; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: daily_service_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_service_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_service_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_service_lines_id_seq OWNED BY public.daily_service_lines.id;


--
-- Name: daily_staff_advances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_staff_advances (
    id integer NOT NULL,
    report_id integer NOT NULL,
    staff_id integer,
    staff_name text NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


--
-- Name: daily_staff_advances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_staff_advances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_staff_advances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_staff_advances_id_seq OWNED BY public.daily_staff_advances.id;


--
-- Name: department_leaders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.department_leaders (
    id integer NOT NULL,
    department_id integer NOT NULL,
    head_staff_id integer,
    subhead_staff_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: department_leaders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.department_leaders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: department_leaders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.department_leaders_id_seq OWNED BY public.department_leaders.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name text NOT NULL,
    floor text NOT NULL,
    head text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    is_clinical boolean DEFAULT false NOT NULL
);


--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: designations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.designations (
    id integer NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: designations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.designations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: designations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.designations_id_seq OWNED BY public.designations.id;


--
-- Name: encounters; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: encounters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.encounters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: encounters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.encounters_id_seq OWNED BY public.encounters.id;


--
-- Name: expense_catalog; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: expense_catalog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expense_catalog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expense_catalog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expense_catalog_id_seq OWNED BY public.expense_catalog.id;


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: expense_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expense_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expense_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expense_categories_id_seq OWNED BY public.expense_categories.id;


--
-- Name: grn_items; Type: TABLE; Schema: public; Owner: -
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
    notes text,
    sale_price numeric(12,2),
    batch_id integer,
    unit_id integer NOT NULL
);


--
-- Name: grn_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grn_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grn_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grn_items_id_seq OWNED BY public.grn_items.id;


--
-- Name: grns; Type: TABLE; Schema: public; Owner: -
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
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    store_id integer
);


--
-- Name: grns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grns_id_seq OWNED BY public.grns.id;


--
-- Name: immunization_records; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: immunization_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.immunization_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: immunization_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.immunization_records_id_seq OWNED BY public.immunization_records.id;


--
-- Name: immunization_schedules; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: immunization_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.immunization_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: immunization_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.immunization_schedules_id_seq OWNED BY public.immunization_schedules.id;


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: inventory_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_items_id_seq OWNED BY public.inventory_items.id;


--
-- Name: item_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_types (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: item_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_types_id_seq OWNED BY public.item_types.id;


--
-- Name: item_unit_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_unit_prices (
    id integer NOT NULL,
    item_id integer NOT NULL,
    cost_price numeric(12,2) DEFAULT 0 NOT NULL,
    sale_price numeric(12,2) DEFAULT 0 NOT NULL,
    conversion_factor numeric(12,6) DEFAULT 1 NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    unit_id integer NOT NULL
);


--
-- Name: item_unit_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_unit_prices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_unit_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_unit_prices_id_seq OWNED BY public.item_unit_prices.id;


--
-- Name: items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.items (
    id integer NOT NULL,
    name text NOT NULL,
    item_type_id integer NOT NULL,
    rate numeric(12,2) DEFAULT 0 NOT NULL,
    gst_percent numeric(5,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    sale_price numeric(12,2) DEFAULT 0 NOT NULL,
    hsn_code text,
    barcode text,
    reorder_level numeric(12,3) DEFAULT 0,
    reorder_qty numeric(12,3) DEFAULT 0,
    drug_schedule text,
    storage_condition text,
    tax_category text DEFAULT 'taxable'::text,
    is_narcotic boolean DEFAULT false,
    allow_fractional boolean DEFAULT false,
    base_unit_id integer NOT NULL,
    purchase_unit_id integer NOT NULL,
    sale_unit_id integer NOT NULL
);


--
-- Name: items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.items_id_seq OWNED BY public.items.id;


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: leave_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leave_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leave_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leave_requests_id_seq OWNED BY public.leave_requests.id;


--
-- Name: leave_types; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: leave_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leave_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leave_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leave_types_id_seq OWNED BY public.leave_types.id;


--
-- Name: management_approvers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.management_approvers (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: management_approvers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.management_approvers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: management_approvers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.management_approvers_id_seq OWNED BY public.management_approvers.id;


--
-- Name: medicines; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: medicines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medicines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medicines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medicines_id_seq OWNED BY public.medicines.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: monthly_bank_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_bank_expenses (
    id integer NOT NULL,
    month text NOT NULL,
    category text NOT NULL,
    label text NOT NULL,
    vendor_id integer,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    payment_mode text DEFAULT 'Bank Transfer'::text NOT NULL,
    payment_date text,
    cheque_issue_date text,
    reference_no text,
    bank_name text,
    narration text,
    is_recurring boolean DEFAULT false NOT NULL,
    is_salary_auto boolean DEFAULT false NOT NULL,
    created_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: monthly_bank_expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.monthly_bank_expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: monthly_bank_expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.monthly_bank_expenses_id_seq OWNED BY public.monthly_bank_expenses.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: nursing_academic_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_academic_schedules (
    id integer NOT NULL,
    batch_id integer NOT NULL,
    academic_year text NOT NULL,
    semester integer DEFAULT 1 NOT NULL,
    start_date text NOT NULL,
    end_date text NOT NULL,
    fee_due_date text,
    fee_due_offset_days integer DEFAULT 15 NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nursing_academic_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_academic_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_academic_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_academic_schedules_id_seq OWNED BY public.nursing_academic_schedules.id;


--
-- Name: nursing_applicants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_applicants (
    id integer NOT NULL,
    application_no text NOT NULL,
    course_id integer NOT NULL,
    academic_year text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    gender text DEFAULT 'Female'::text NOT NULL,
    dob text,
    address text,
    entrance_merit_score numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    quota_category text DEFAULT 'general'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    seat_booking_amount numeric(12,2) DEFAULT '0'::numeric,
    seat_booking_status text DEFAULT 'none'::text,
    seat_booking_receipt_no text,
    seat_booking_date text,
    seat_booking_payment_mode text,
    seat_booking_notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    aadhar_no text,
    father_name text,
    father_phone text,
    father_aadhar_no text,
    father_occupation text,
    father_organization text,
    father_annual_income numeric(14,2),
    mother_name text,
    mother_phone text,
    mother_aadhar_no text,
    mother_occupation text,
    mother_organization text,
    mother_annual_income numeric(14,2),
    present_address text,
    present_district text,
    present_pincode text,
    present_state text,
    permanent_address text,
    permanent_district text,
    permanent_pincode text,
    permanent_state text,
    academic_history jsonb,
    referrer_id integer,
    referral_amount text,
    referral_comments text,
    father_deceased boolean DEFAULT false,
    mother_deceased boolean DEFAULT false,
    has_guardian boolean DEFAULT false,
    guardian_name text,
    guardian_relation text,
    guardian_phone text,
    guardian_aadhar_no text,
    guardian_occupation text,
    guardian_organization text,
    guardian_annual_income numeric(14,2)
);


--
-- Name: nursing_applicants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_applicants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_applicants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_applicants_id_seq OWNED BY public.nursing_applicants.id;


--
-- Name: nursing_attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_attendance_records (
    id integer NOT NULL,
    student_id integer NOT NULL,
    batch_id integer NOT NULL,
    session_date date NOT NULL,
    subject_name text,
    session_type text DEFAULT 'theory'::text NOT NULL,
    status text DEFAULT 'present'::text NOT NULL,
    marked_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nursing_attendance_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_attendance_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_attendance_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_attendance_records_id_seq OWNED BY public.nursing_attendance_records.id;


--
-- Name: nursing_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_audit_logs (
    id integer NOT NULL,
    entity text NOT NULL,
    entity_id text NOT NULL,
    action text NOT NULL,
    changed_by text,
    diff jsonb,
    changed_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nursing_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_audit_logs_id_seq OWNED BY public.nursing_audit_logs.id;


--
-- Name: nursing_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_batches (
    id integer NOT NULL,
    course_id integer NOT NULL,
    academic_year text NOT NULL,
    section text DEFAULT 'A'::text NOT NULL,
    max_seats integer DEFAULT 60 NOT NULL,
    start_date text,
    end_date text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nursing_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_batches_id_seq OWNED BY public.nursing_batches.id;


--
-- Name: nursing_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_courses (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    duration_years integer DEFAULT 3 NOT NULL,
    total_seats integer DEFAULT 60 NOT NULL,
    regulatory_body text DEFAULT 'INC / State Council'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nursing_courses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_courses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_courses_id_seq OWNED BY public.nursing_courses.id;


--
-- Name: nursing_fee_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_fee_structures (
    id integer NOT NULL,
    course_id integer NOT NULL,
    quota_category text DEFAULT 'general'::text NOT NULL,
    academic_year text NOT NULL,
    fee_type text DEFAULT 'Tuition & Composite Fee'::text NOT NULL,
    payment_frequency text DEFAULT 'yearly'::text NOT NULL,
    one_time_rebate_percent numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    tuition_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    admission_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    security_deposit numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    uniform_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    hostel_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    hostel_mess_monthly_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    exam_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    misc_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    rebates_config text,
    surcharges_config text,
    components_config text,
    total_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nursing_fee_structures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_fee_structures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_fee_structures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_fee_structures_id_seq OWNED BY public.nursing_fee_structures.id;


--
-- Name: nursing_fee_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_fee_transactions (
    id integer NOT NULL,
    student_id integer,
    applicant_id integer,
    fee_structure_id integer,
    invoice_no text NOT NULL,
    receipt_number text NOT NULL,
    fee_type text,
    payment_frequency text,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    payment_mode text DEFAULT 'cash'::text NOT NULL,
    payment_date text NOT NULL,
    status text DEFAULT 'paid'::text NOT NULL,
    remarks jsonb,
    collected_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nursing_fee_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_fee_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_fee_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_fee_transactions_id_seq OWNED BY public.nursing_fee_transactions.id;


--
-- Name: nursing_referrer_payment_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_referrer_payment_allocations (
    id integer NOT NULL,
    payment_id integer NOT NULL,
    student_id integer,
    applicant_id integer,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nursing_referrer_payment_allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_referrer_payment_allocations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_referrer_payment_allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_referrer_payment_allocations_id_seq OWNED BY public.nursing_referrer_payment_allocations.id;


--
-- Name: nursing_referrer_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_referrer_payments (
    id integer NOT NULL,
    referrer_id integer NOT NULL,
    voucher_no text NOT NULL,
    payment_date text NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    payment_mode text DEFAULT 'cash'::text NOT NULL,
    reference_number text,
    paid_by text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nursing_referrer_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_referrer_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_referrer_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_referrer_payments_id_seq OWNED BY public.nursing_referrer_payments.id;


--
-- Name: nursing_referrers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_referrers (
    id integer NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    address text,
    comments text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nursing_referrers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_referrers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_referrers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_referrers_id_seq OWNED BY public.nursing_referrers.id;


--
-- Name: nursing_student_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_student_documents (
    id integer NOT NULL,
    applicant_id integer,
    student_id integer,
    document_type text NOT NULL,
    title text NOT NULL,
    file_url text NOT NULL,
    verification_status text DEFAULT 'pending'::text NOT NULL,
    verified_by text,
    verified_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nursing_student_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_student_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_student_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_student_documents_id_seq OWNED BY public.nursing_student_documents.id;


--
-- Name: nursing_student_fee_frequencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_student_fee_frequencies (
    id integer NOT NULL,
    student_id integer NOT NULL,
    academic_year text NOT NULL,
    component_id text,
    component_name text NOT NULL,
    frequency_key text NOT NULL,
    frequency_label text,
    installment_count integer DEFAULT 1 NOT NULL,
    base_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    installment_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    locked_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nursing_student_fee_frequencies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_student_fee_frequencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_student_fee_frequencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_student_fee_frequencies_id_seq OWNED BY public.nursing_student_fee_frequencies.id;


--
-- Name: nursing_students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_students (
    id integer NOT NULL,
    applicant_id integer,
    batch_id integer NOT NULL,
    enrollment_no text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    gender text DEFAULT 'Female'::text NOT NULL,
    dob text,
    address text,
    guardian_name text,
    guardian_phone text,
    guardian_relation text,
    status text DEFAULT 'active'::text NOT NULL,
    admission_date text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    aadhar_no text,
    father_name text,
    father_phone text,
    father_aadhar_no text,
    father_occupation text,
    father_organization text,
    father_annual_income numeric(14,2),
    mother_name text,
    mother_phone text,
    mother_aadhar_no text,
    mother_occupation text,
    mother_organization text,
    mother_annual_income numeric(14,2),
    present_address text,
    present_district text,
    present_pincode text,
    present_state text,
    permanent_address text,
    permanent_district text,
    permanent_pincode text,
    permanent_state text,
    academic_history jsonb,
    referrer_id integer,
    referral_amount text,
    referral_comments text,
    father_deceased boolean DEFAULT false,
    mother_deceased boolean DEFAULT false,
    has_guardian boolean DEFAULT false,
    guardian_aadhar_no text,
    guardian_occupation text,
    guardian_organization text,
    guardian_annual_income numeric(14,2)
);


--
-- Name: nursing_students_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_students_id_seq OWNED BY public.nursing_students.id;


--
-- Name: nursing_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_subjects (
    id integer NOT NULL,
    course_id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    year integer DEFAULT 1 NOT NULL,
    semester integer DEFAULT 1 NOT NULL,
    theory_max_marks integer DEFAULT 75 NOT NULL,
    practical_max_marks integer DEFAULT 25 NOT NULL,
    credits integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nursing_subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_subjects_id_seq OWNED BY public.nursing_subjects.id;


--
-- Name: nursing_supers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nursing_supers (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nursing_supers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nursing_supers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nursing_supers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nursing_supers_id_seq OWNED BY public.nursing_supers.id;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- Name: payslips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payslips (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    month text NOT NULL,
    basic_salary numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    hra numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    conveyance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
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
    status text DEFAULT 'Draft'::text NOT NULL,
    hr_notes text,
    coo_notes text,
    accounts_notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    skill_allowance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    earned_leave_encashment numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    extra_day_allowance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    tds numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    security_deposit numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    payment_mode text DEFAULT 'Bank Transfer'::text NOT NULL,
    bank_name text,
    account_number text,
    ifsc_code text,
    cheque_number text,
    cheque_date text
);


--
-- Name: payslips_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payslips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payslips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payslips_id_seq OWNED BY public.payslips.id;


--
-- Name: po_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.po_items (
    id integer NOT NULL,
    po_id integer NOT NULL,
    item_name text NOT NULL,
    category text,
    ordered_qty numeric(12,2) NOT NULL,
    unit_rate numeric(12,2) NOT NULL,
    gst_percent numeric(5,2) DEFAULT 0 NOT NULL,
    line_value numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    unit_id integer NOT NULL
);


--
-- Name: po_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.po_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: po_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.po_items_id_seq OWNED BY public.po_items.id;


--
-- Name: po_payments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: po_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.po_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: po_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.po_payments_id_seq OWNED BY public.po_payments.id;


--
-- Name: prescription_lines; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: prescription_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prescription_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prescription_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prescription_lines_id_seq OWNED BY public.prescription_lines.id;


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: prescriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prescriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prescriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prescriptions_id_seq OWNED BY public.prescriptions.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: report_category_exclusions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_category_exclusions (
    id integer NOT NULL,
    user_id text NOT NULL,
    report_type text DEFAULT 'monthly-report'::text NOT NULL,
    excluded_categories jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: report_category_exclusions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_category_exclusions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: report_category_exclusions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_category_exclusions_id_seq OWNED BY public.report_category_exclusions.id;


--
-- Name: rosters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rosters (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    department_id integer NOT NULL,
    shift_id integer NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    date text NOT NULL
);


--
-- Name: rosters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rosters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rosters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rosters_id_seq OWNED BY public.rosters.id;


--
-- Name: security_deposit_refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_deposit_refunds (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    refund_date text NOT NULL,
    notes text,
    processed_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: security_deposit_refunds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.security_deposit_refunds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: security_deposit_refunds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.security_deposit_refunds_id_seq OWNED BY public.security_deposit_refunds.id;


--
-- Name: service_catalog; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: service_catalog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_catalog_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_catalog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_catalog_id_seq OWNED BY public.service_catalog.id;


--
-- Name: service_categories; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: service_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_categories_id_seq OWNED BY public.service_categories.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shifts_id_seq OWNED BY public.shifts.id;


--
-- Name: staff; Type: TABLE; Schema: public; Owner: -
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
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    effective_date text,
    employment_type text DEFAULT 'Permanent'::text NOT NULL,
    permanent_confirmation_date text,
    employment_start_date text,
    employment_end_date text
);


--
-- Name: staff_departments; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: staff_departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_departments_id_seq OWNED BY public.staff_departments.id;


--
-- Name: staff_hr_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_hr_profiles (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    staff_version integer DEFAULT 1 NOT NULL,
    date_of_birth text,
    gender text,
    marital_status text,
    blood_group text,
    emergency_contact_name text,
    emergency_contact_phone text,
    current_address text,
    permanent_address text,
    education_history jsonb DEFAULT '[]'::jsonb NOT NULL,
    professional_history jsonb DEFAULT '[]'::jsonb NOT NULL,
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
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    nationality text DEFAULT 'Indian'::text,
    landmar_current_address text,
    landmark_permanent_address text,
    certifications jsonb DEFAULT '[]'::jsonb NOT NULL,
    family_members jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: staff_hr_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_hr_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_hr_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_hr_profiles_id_seq OWNED BY public.staff_hr_profiles.id;


--
-- Name: staff_off_day_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_off_day_requests (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    original_date text NOT NULL,
    requested_date text NOT NULL,
    reason text,
    status text DEFAULT 'Pending'::text NOT NULL,
    reviewed_by_id text,
    reviewer_note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_off_day_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_off_day_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_off_day_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_off_day_requests_id_seq OWNED BY public.staff_off_day_requests.id;


--
-- Name: staff_salaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_salaries (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    staff_version integer DEFAULT 1 NOT NULL,
    basic_salary numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    hra numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    conveyance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
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
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    skill_allowance numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    deduct_tds boolean DEFAULT false NOT NULL,
    tds_percent numeric(5,2) DEFAULT '10'::numeric NOT NULL,
    tds numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    security_deposit_total numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    security_deposit numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    security_deposit_start_month text
);


--
-- Name: staff_salaries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_salaries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_salaries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_salaries_id_seq OWNED BY public.staff_salaries.id;


--
-- Name: staff_supervisors; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: staff_supervisors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_supervisors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_supervisors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_supervisors_id_seq OWNED BY public.staff_supervisors.id;


--
-- Name: staff_weekly_off_days; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_weekly_off_days (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    days_of_week jsonb DEFAULT '[]'::jsonb NOT NULL,
    effective_from text NOT NULL,
    effective_to text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_weekly_off_days_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_weekly_off_days_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_weekly_off_days_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_weekly_off_days_id_seq OWNED BY public.staff_weekly_off_days.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: unit_conversions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unit_conversions (
    id integer NOT NULL,
    from_unit_id integer NOT NULL,
    to_unit_id integer NOT NULL,
    multiplier numeric(12,6) NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: unit_conversions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unit_conversions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unit_conversions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unit_conversions_id_seq OWNED BY public.unit_conversions.id;


--
-- Name: unit_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unit_types (
    id integer NOT NULL,
    name text NOT NULL,
    symbol text NOT NULL,
    category text DEFAULT 'Count/Quantity'::text NOT NULL,
    is_base_unit boolean DEFAULT false NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: unit_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unit_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unit_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unit_types_id_seq OWNED BY public.unit_types.id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendors_id_seq OWNED BY public.vendors.id;


--
-- Name: verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp without time zone NOT NULL,
    "createdAt" timestamp without time zone,
    "updatedAt" timestamp without time zone
);


--
-- Name: document_sequences id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.document_sequences ALTER COLUMN id SET DEFAULT nextval('inventory.document_sequences_id_seq'::regclass);


--
-- Name: item_batches id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.item_batches ALTER COLUMN id SET DEFAULT nextval('inventory.item_batches_id_seq'::regclass);


--
-- Name: purchase_invoice_items id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoice_items ALTER COLUMN id SET DEFAULT nextval('inventory.purchase_invoice_items_id_seq'::regclass);


--
-- Name: purchase_invoice_payments id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoice_payments ALTER COLUMN id SET DEFAULT nextval('inventory.purchase_invoice_payments_id_seq'::regclass);


--
-- Name: purchase_invoices id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoices ALTER COLUMN id SET DEFAULT nextval('inventory.purchase_invoices_id_seq'::regclass);


--
-- Name: sales_invoice_items id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_invoice_items ALTER COLUMN id SET DEFAULT nextval('inventory.sales_invoice_items_id_seq'::regclass);


--
-- Name: sales_invoices id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_invoices ALTER COLUMN id SET DEFAULT nextval('inventory.sales_invoices_id_seq'::regclass);


--
-- Name: sales_return_items id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_return_items ALTER COLUMN id SET DEFAULT nextval('inventory.sales_return_items_id_seq'::regclass);


--
-- Name: sales_returns id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_returns ALTER COLUMN id SET DEFAULT nextval('inventory.sales_returns_id_seq'::regclass);


--
-- Name: stock_adjustment_items id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_adjustment_items ALTER COLUMN id SET DEFAULT nextval('inventory.stock_adjustment_items_id_seq'::regclass);


--
-- Name: stock_adjustments id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_adjustments ALTER COLUMN id SET DEFAULT nextval('inventory.stock_adjustments_id_seq'::regclass);


--
-- Name: stock_ledger id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_ledger ALTER COLUMN id SET DEFAULT nextval('inventory.stock_ledger_id_seq'::regclass);


--
-- Name: stock_requisition_items id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_requisition_items ALTER COLUMN id SET DEFAULT nextval('inventory.stock_requisition_items_id_seq'::regclass);


--
-- Name: stock_requisitions id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_requisitions ALTER COLUMN id SET DEFAULT nextval('inventory.stock_requisitions_id_seq'::regclass);


--
-- Name: stock_transfer_items id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_transfer_items ALTER COLUMN id SET DEFAULT nextval('inventory.stock_transfer_items_id_seq'::regclass);


--
-- Name: stock_transfers id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_transfers ALTER COLUMN id SET DEFAULT nextval('inventory.stock_transfers_id_seq'::regclass);


--
-- Name: store_batch_stock id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.store_batch_stock ALTER COLUMN id SET DEFAULT nextval('inventory.store_batch_stock_id_seq'::regclass);


--
-- Name: store_staff_assignments id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.store_staff_assignments ALTER COLUMN id SET DEFAULT nextval('inventory.store_staff_assignments_id_seq'::regclass);


--
-- Name: stores id; Type: DEFAULT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stores ALTER COLUMN id SET DEFAULT nextval('inventory.stores_id_seq'::regclass);


--
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: bank_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts ALTER COLUMN id SET DEFAULT nextval('public.bank_accounts_id_seq'::regclass);


--
-- Name: banks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banks ALTER COLUMN id SET DEFAULT nextval('public.banks_id_seq'::regclass);


--
-- Name: biometric_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_mappings ALTER COLUMN id SET DEFAULT nextval('public.biometric_mappings_id_seq'::regclass);


--
-- Name: consultant_rates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultant_rates ALTER COLUMN id SET DEFAULT nextval('public.consultant_rates_id_seq'::regclass);


--
-- Name: daily_additional_income id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_additional_income ALTER COLUMN id SET DEFAULT nextval('public.daily_additional_income_id_seq'::regclass);


--
-- Name: daily_closing_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_closing_reports ALTER COLUMN id SET DEFAULT nextval('public.daily_closing_reports_id_seq'::regclass);


--
-- Name: daily_discounts_returns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_discounts_returns ALTER COLUMN id SET DEFAULT nextval('public.daily_discounts_returns_id_seq'::regclass);


--
-- Name: daily_expenditures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_expenditures ALTER COLUMN id SET DEFAULT nextval('public.daily_expenditures_id_seq'::regclass);


--
-- Name: daily_ipd_admissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_ipd_admissions ALTER COLUMN id SET DEFAULT nextval('public.daily_ipd_admissions_id_seq'::regclass);


--
-- Name: daily_ipd_discharges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_ipd_discharges ALTER COLUMN id SET DEFAULT nextval('public.daily_ipd_discharges_id_seq'::regclass);


--
-- Name: daily_payment_channels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_payment_channels ALTER COLUMN id SET DEFAULT nextval('public.daily_payment_channels_id_seq'::regclass);


--
-- Name: daily_pharmacy_income id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_pharmacy_income ALTER COLUMN id SET DEFAULT nextval('public.daily_pharmacy_income_id_seq'::regclass);


--
-- Name: daily_service_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_service_lines ALTER COLUMN id SET DEFAULT nextval('public.daily_service_lines_id_seq'::regclass);


--
-- Name: daily_staff_advances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_staff_advances ALTER COLUMN id SET DEFAULT nextval('public.daily_staff_advances_id_seq'::regclass);


--
-- Name: department_leaders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_leaders ALTER COLUMN id SET DEFAULT nextval('public.department_leaders_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: designations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designations ALTER COLUMN id SET DEFAULT nextval('public.designations_id_seq'::regclass);


--
-- Name: encounters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters ALTER COLUMN id SET DEFAULT nextval('public.encounters_id_seq'::regclass);


--
-- Name: expense_catalog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_catalog ALTER COLUMN id SET DEFAULT nextval('public.expense_catalog_id_seq'::regclass);


--
-- Name: expense_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories ALTER COLUMN id SET DEFAULT nextval('public.expense_categories_id_seq'::regclass);


--
-- Name: grn_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grn_items ALTER COLUMN id SET DEFAULT nextval('public.grn_items_id_seq'::regclass);


--
-- Name: grns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grns ALTER COLUMN id SET DEFAULT nextval('public.grns_id_seq'::regclass);


--
-- Name: immunization_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immunization_records ALTER COLUMN id SET DEFAULT nextval('public.immunization_records_id_seq'::regclass);


--
-- Name: immunization_schedules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immunization_schedules ALTER COLUMN id SET DEFAULT nextval('public.immunization_schedules_id_seq'::regclass);


--
-- Name: inventory_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_items_id_seq'::regclass);


--
-- Name: item_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_types ALTER COLUMN id SET DEFAULT nextval('public.item_types_id_seq'::regclass);


--
-- Name: item_unit_prices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_unit_prices ALTER COLUMN id SET DEFAULT nextval('public.item_unit_prices_id_seq'::regclass);


--
-- Name: items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items ALTER COLUMN id SET DEFAULT nextval('public.items_id_seq'::regclass);


--
-- Name: leave_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests ALTER COLUMN id SET DEFAULT nextval('public.leave_requests_id_seq'::regclass);


--
-- Name: leave_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types ALTER COLUMN id SET DEFAULT nextval('public.leave_types_id_seq'::regclass);


--
-- Name: management_approvers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.management_approvers ALTER COLUMN id SET DEFAULT nextval('public.management_approvers_id_seq'::regclass);


--
-- Name: medicines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicines ALTER COLUMN id SET DEFAULT nextval('public.medicines_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: monthly_bank_expenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_bank_expenses ALTER COLUMN id SET DEFAULT nextval('public.monthly_bank_expenses_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: nursing_academic_schedules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_academic_schedules ALTER COLUMN id SET DEFAULT nextval('public.nursing_academic_schedules_id_seq'::regclass);


--
-- Name: nursing_applicants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_applicants ALTER COLUMN id SET DEFAULT nextval('public.nursing_applicants_id_seq'::regclass);


--
-- Name: nursing_attendance_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_attendance_records ALTER COLUMN id SET DEFAULT nextval('public.nursing_attendance_records_id_seq'::regclass);


--
-- Name: nursing_audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.nursing_audit_logs_id_seq'::regclass);


--
-- Name: nursing_batches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_batches ALTER COLUMN id SET DEFAULT nextval('public.nursing_batches_id_seq'::regclass);


--
-- Name: nursing_courses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_courses ALTER COLUMN id SET DEFAULT nextval('public.nursing_courses_id_seq'::regclass);


--
-- Name: nursing_fee_structures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_fee_structures ALTER COLUMN id SET DEFAULT nextval('public.nursing_fee_structures_id_seq'::regclass);


--
-- Name: nursing_fee_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_fee_transactions ALTER COLUMN id SET DEFAULT nextval('public.nursing_fee_transactions_id_seq'::regclass);


--
-- Name: nursing_referrer_payment_allocations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_referrer_payment_allocations ALTER COLUMN id SET DEFAULT nextval('public.nursing_referrer_payment_allocations_id_seq'::regclass);


--
-- Name: nursing_referrer_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_referrer_payments ALTER COLUMN id SET DEFAULT nextval('public.nursing_referrer_payments_id_seq'::regclass);


--
-- Name: nursing_referrers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_referrers ALTER COLUMN id SET DEFAULT nextval('public.nursing_referrers_id_seq'::regclass);


--
-- Name: nursing_student_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_student_documents ALTER COLUMN id SET DEFAULT nextval('public.nursing_student_documents_id_seq'::regclass);


--
-- Name: nursing_student_fee_frequencies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_student_fee_frequencies ALTER COLUMN id SET DEFAULT nextval('public.nursing_student_fee_frequencies_id_seq'::regclass);


--
-- Name: nursing_students id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_students ALTER COLUMN id SET DEFAULT nextval('public.nursing_students_id_seq'::regclass);


--
-- Name: nursing_subjects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_subjects ALTER COLUMN id SET DEFAULT nextval('public.nursing_subjects_id_seq'::regclass);


--
-- Name: nursing_supers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_supers ALTER COLUMN id SET DEFAULT nextval('public.nursing_supers_id_seq'::regclass);


--
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- Name: payslips id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslips ALTER COLUMN id SET DEFAULT nextval('public.payslips_id_seq'::regclass);


--
-- Name: po_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_items ALTER COLUMN id SET DEFAULT nextval('public.po_items_id_seq'::regclass);


--
-- Name: po_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_payments ALTER COLUMN id SET DEFAULT nextval('public.po_payments_id_seq'::regclass);


--
-- Name: prescription_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_lines ALTER COLUMN id SET DEFAULT nextval('public.prescription_lines_id_seq'::regclass);


--
-- Name: prescriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions ALTER COLUMN id SET DEFAULT nextval('public.prescriptions_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: report_category_exclusions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_category_exclusions ALTER COLUMN id SET DEFAULT nextval('public.report_category_exclusions_id_seq'::regclass);


--
-- Name: rosters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rosters ALTER COLUMN id SET DEFAULT nextval('public.rosters_id_seq'::regclass);


--
-- Name: security_deposit_refunds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_deposit_refunds ALTER COLUMN id SET DEFAULT nextval('public.security_deposit_refunds_id_seq'::regclass);


--
-- Name: service_catalog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_catalog ALTER COLUMN id SET DEFAULT nextval('public.service_catalog_id_seq'::regclass);


--
-- Name: service_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories ALTER COLUMN id SET DEFAULT nextval('public.service_categories_id_seq'::regclass);


--
-- Name: shifts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts ALTER COLUMN id SET DEFAULT nextval('public.shifts_id_seq'::regclass);


--
-- Name: staff_departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_departments ALTER COLUMN id SET DEFAULT nextval('public.staff_departments_id_seq'::regclass);


--
-- Name: staff_hr_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_hr_profiles ALTER COLUMN id SET DEFAULT nextval('public.staff_hr_profiles_id_seq'::regclass);


--
-- Name: staff_off_day_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_off_day_requests ALTER COLUMN id SET DEFAULT nextval('public.staff_off_day_requests_id_seq'::regclass);


--
-- Name: staff_salaries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_salaries ALTER COLUMN id SET DEFAULT nextval('public.staff_salaries_id_seq'::regclass);


--
-- Name: staff_supervisors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_supervisors ALTER COLUMN id SET DEFAULT nextval('public.staff_supervisors_id_seq'::regclass);


--
-- Name: staff_weekly_off_days id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_weekly_off_days ALTER COLUMN id SET DEFAULT nextval('public.staff_weekly_off_days_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: unit_conversions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_conversions ALTER COLUMN id SET DEFAULT nextval('public.unit_conversions_id_seq'::regclass);


--
-- Name: unit_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_types ALTER COLUMN id SET DEFAULT nextval('public.unit_types_id_seq'::regclass);


--
-- Name: vendors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors ALTER COLUMN id SET DEFAULT nextval('public.vendors_id_seq'::regclass);


--
-- Data for Name: document_sequences; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.document_sequences (id, code, prefix, financial_year, current_val, padding, updated_at) FROM stdin;
2	PO	PO	26-27	0	5	2026-08-23 09:47:31.776641
7	RET	RET	26-27	0	5	2026-08-23 09:47:31.802872
1	GRN	GRN	26-27	1	5	2026-08-23 09:47:37.969
8	TEST_SEQ	TEST_SEQ	26-27	10	5	2026-08-23 09:47:38.022
5	REQ	REQ	26-27	1	5	2026-08-23 10:08:14.635
4	TRN	TRN	26-27	1	5	2026-08-23 10:12:04.62
3	INV	INV	26-27	3	5	2026-08-23 15:48:57.314
6	ADJ	ADJ	26-27	1	5	2026-08-23 16:10:44.862
9	PIN	PIN	26-27	0	5	2026-08-23 16:56:59.343126
\.


--
-- Data for Name: item_batches; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.item_batches (id, item_id, batch_number, mfg_date, expiry_date, mrp, purchase_rate, sale_rate, barcode, supplier_id, is_active, created_at, updated_at) FROM stdin;
1	1	BATCH-A-1787478462192	\N	2026-10-22	100.00	50.00	100.00	\N	\N	t	2026-08-23 09:47:42.192709	2026-08-23 09:47:42.192709
2	1	BATCH-B-1787478462199	\N	2026-09-22	100.00	50.00	100.00	\N	\N	t	2026-08-23 09:47:42.192709	2026-08-23 09:47:42.192709
\.


--
-- Data for Name: purchase_invoice_items; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.purchase_invoice_items (id, invoice_id, item_id, grn_item_id, quantity, unit_id, unit_rate, discount_percent, discount_amount, taxable_amount, hsn_code, gst_percent, cgst_amount, sgst_amount, igst_amount, total_amount) FROM stdin;
\.


--
-- Data for Name: purchase_invoice_payments; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.purchase_invoice_payments (id, invoice_id, payment_date, amount, payment_mode, reference_no, remarks, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: purchase_invoices; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.purchase_invoices (id, invoice_no, invoice_date, vendor_id, grn_id, po_id, status, subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount, igst_amount, tds_amount, round_off, net_amount, credit_days, due_date, paid_amount, remarks, verified_by, approved_by, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sales_invoice_items; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.sales_invoice_items (id, invoice_id, item_id, batch_id, quantity, unit, unit_rate, mrp, discount_percent, discount_amount, taxable_amount, gst_percent, cgst_amount, sgst_amount, igst_amount, total_amount) FROM stdin;
1	1	1	1	8.000	strip	100.00	100.00	0.00	0.00	800.00	12.00	48.00	48.00	0.00	896.00
2	1	1	2	6.000	strip	100.00	100.00	0.00	0.00	600.00	12.00	36.00	36.00	0.00	672.00
3	2	1	1	4.000	strip	100.00	100.00	10.00	40.00	360.00	12.00	21.60	21.60	0.00	403.20
4	3	1	1	1.000	strip	100.00	100.00	0.00	0.00	100.00	12.00	6.00	6.00	0.00	112.00
\.


--
-- Data for Name: sales_invoices; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.sales_invoices (id, invoice_no, invoice_date, store_id, patient_id, customer_name, customer_phone, doctor_name, prescription_id, subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount, igst_amount, round_off, net_amount, payment_mode, status, cashier_id, created_at, updated_at) FROM stdin;
1	INV/26-27/00001	2026-08-23 10:19:46.669	1	\N	Subhashchandra	\N	\N	\N	1400.00	0.00	1400.00	84.00	84.00	0.00	0.00	1568.00	upi	completed	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	2026-08-23 10:19:46.660546	2026-08-23 10:19:46.660546
2	INV/26-27/00002	2026-08-23 15:43:02.349	1	\N	...	\N	\N	\N	400.00	40.00	360.00	21.60	21.60	0.00	-0.20	403.00	cash	completed	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	2026-08-23 15:43:02.33775	2026-08-23 15:43:02.33775
3	INV/26-27/00003	2026-08-23 15:48:57.328	1	\N	\N	\N	\N	\N	100.00	0.00	100.00	6.00	6.00	0.00	0.00	112.00	cash	completed	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	2026-08-23 15:48:57.318652	2026-08-23 15:48:57.318652
\.


--
-- Data for Name: sales_return_items; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.sales_return_items (id, return_id, item_id, batch_id, returned_qty, unit_rate, refund_amount) FROM stdin;
\.


--
-- Data for Name: sales_returns; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.sales_returns (id, return_no, original_invoice_id, store_id, return_date, total_refund_amount, refund_mode, reason, cashier_id, created_at) FROM stdin;
\.


--
-- Data for Name: stock_adjustment_items; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.stock_adjustment_items (id, adjustment_id, item_id, batch_id, system_qty, physical_qty, difference_qty, type) FROM stdin;
1	1	1	2	1.000	5.000	4.000	damaged
\.


--
-- Data for Name: stock_adjustments; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.stock_adjustments (id, adjustment_no, store_id, reason, status, created_by, approved_by, created_at, updated_at) FROM stdin;
1	ADJ/26-27/00001	2	Physical Stock Count / Variance Reconciliation	posted	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	2026-08-23 16:10:44.850594	2026-08-23 16:10:55.793
\.


--
-- Data for Name: stock_ledger; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.stock_ledger (id, transaction_date, store_id, item_id, batch_id, movement_type, reference_type, reference_id, quantity_change, balance_after, cost_price, sale_price, created_by, created_at) FROM stdin;
1	2026-08-23 09:47:42.192709	1	1	1	GRN	GRN	0	20.000	20.000	50.00	100.00	\N	2026-08-23 09:47:42.192709
2	2026-08-23 09:47:42.192709	1	1	2	GRN	GRN	0	30.000	30.000	50.00	100.00	\N	2026-08-23 09:47:42.192709
3	2026-08-23 10:14:52.266148	1	1	2	TRANSFER_OUT	TRANSFER	1	-1.000	29.000	50.00	0.00	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	2026-08-23 10:14:52.266148
4	2026-08-23 10:15:00.502873	2	1	2	TRANSFER_IN	TRANSFER	1	1.000	1.000	50.00	0.00	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	2026-08-23 10:15:00.502873
5	2026-08-23 10:19:46.660546	1	1	1	SALE	POS_INVOICE	1	-8.000	12.000	0.00	100.00	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	2026-08-23 10:19:46.660546
6	2026-08-23 10:19:46.660546	1	1	2	SALE	POS_INVOICE	1	-6.000	23.000	0.00	100.00	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	2026-08-23 10:19:46.660546
7	2026-08-23 15:43:02.33775	1	1	1	SALE	POS_INVOICE	2	-4.000	8.000	0.00	100.00	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	2026-08-23 15:43:02.33775
8	2026-08-23 15:48:57.318652	1	1	1	SALE	POS_INVOICE	3	-1.000	7.000	0.00	100.00	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	2026-08-23 15:48:57.318652
9	2026-08-23 16:10:55.760628	2	1	2	ADJUSTMENT_ADD	STOCK_ADJUSTMENT	1	4.000	5.000	0.00	0.00	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	2026-08-23 16:10:55.760628
\.


--
-- Data for Name: stock_requisition_items; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.stock_requisition_items (id, requisition_id, item_id, requested_qty, approved_qty, fulfilled_qty, unit) FROM stdin;
1	1	1	1.000	1.000	0.000	strip
\.


--
-- Data for Name: stock_requisitions; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.stock_requisitions (id, requisition_no, requesting_store_id, fulfilling_store_id, status, priority, requested_by, approved_by, remarks, created_at, updated_at) FROM stdin;
1	REQ/26-27/00001	2	1	approved	urgent	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	ssss	2026-08-23 10:08:14.639626	2026-08-23 10:10:10.272
\.


--
-- Data for Name: stock_transfer_items; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.stock_transfer_items (id, transfer_id, item_id, batch_id, quantity, unit, unit_rate) FROM stdin;
1	1	1	2	1.000	strip	50.00
\.


--
-- Data for Name: stock_transfers; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.stock_transfers (id, transfer_no, from_store_id, to_store_id, requisition_id, status, dispatched_by, received_by, dispatched_at, received_at, remarks, created_at, updated_at) FROM stdin;
1	TRN/26-27/00001	1	2	\N	received	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	2026-08-23 10:14:52.285	2026-08-23 10:15:00.507	ssssssssssssssssss	2026-08-23 10:12:04.619407	2026-08-23 10:15:00.507
\.


--
-- Data for Name: store_batch_stock; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.store_batch_stock (id, store_id, item_id, batch_id, quantity_on_hand, allocated_qty, available_qty, updated_at) FROM stdin;
2	1	1	2	23.000	0.000	23.000	2026-08-23 10:19:46.701
1	1	1	1	7.000	0.000	7.000	2026-08-23 15:48:57.345
3	2	1	2	5.000	0.000	5.000	2026-08-23 16:10:55.764
\.


--
-- Data for Name: store_staff_assignments; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.store_staff_assignments (id, staff_id, store_id, can_bill, can_receive, can_transfer, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stores; Type: TABLE DATA; Schema: inventory; Owner: -
--

COPY inventory.stores (id, name, code, type, department_id, location, active, is_default, created_at, updated_at) FROM stdin;
1	Central Warehouse / Main Store	MAIN-WH	central	\N	Ground Floor - Main Block	t	t	2026-08-23 09:47:31.760921	2026-08-23 09:47:31.760921
2	DISPENSARY	DISP	retail_pharmacy	\N	Ground Floor	t	f	2026-08-23 09:59:09.089598	2026-08-23 09:59:09.089598
3	Ward Dispensary	WARD-DISP	ward	\N	2nd & 3rd Floor	t	f	2026-08-24 05:40:11.260839	2026-08-24 05:40:11.260839
\.


--
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.account (id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", scope, password, "createdAt", "updatedAt") FROM stdin;
9yYuJD540MupdtzK6jwrxyAppagAfaIN	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	credential	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	\N	\N	\N	\N	\N	\N	5950a2f44853600a501a1587a93b952f:b2530ca1875473afd9e23d50c1e91657f4e8553dad6d0dc3e9f2fdaa98cb22452d47ffda11e0a8acd1802562de6b44a6bc6b1d3f84b0bcf1ecc841c81ce6eae2	2026-07-14 11:10:25.23	2026-07-14 11:10:25.23
lFoWwwmGrv1GH6LrW9fbI4n8gsDcfnmR	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	credential	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	\N	\N	\N	\N	\N	\N	fe34c987dd44c4ea9bd0095865a794f4:25ef9613564d8194b9384c380c37e0cc9cec7b0fb96a3f2e4182d34eccc1b7f20adb0494193f6e994765eac91a4a40bee98ff00394bf35a780baeedefaed8aea	2026-07-14 11:46:57.294	2026-07-14 11:46:57.294
nLwU5lC0hL8Dgats9cNUn6QysrEib9Az	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	credential	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	\N	\N	\N	\N	\N	\N	05ce2baba03e628ad37b4fe43433de37:99b806f20b8c19bba46e9292b043e454f1df23198de38dd68275c3808e0786ad2e67ef6468b00d84f361dd0b19527ee1357aa8b125ad62b4a57ab31a8cb2951f	2026-07-14 11:47:13.378	2026-07-14 11:47:13.378
mVFzsXJG6UHjd2qhP9wVG6lqhzbHQgbd	1Dv121z8xdadYrlt8gVSvuFytyzP7KGH	credential	1Dv121z8xdadYrlt8gVSvuFytyzP7KGH	\N	\N	\N	\N	\N	\N	8071c78d1bf5fe8c922d9d2bc6ae0830:cb029045ecee64d0b71253a23969a588d7c02806be1362b536f1b4bb6eeb9f32414407a30798836dcca2b710aa96f5b4cafafbe86b597ae7388b30c402aa0402	2026-07-16 11:58:15.622	2026-07-16 11:58:15.622
VOHAaFAAqqPI80Khz9Bv2ijM2P8ZrM7N	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	credential	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	\N	\N	\N	\N	\N	8c7c24ccc9588a675af8cf2ee3ba37aa:7d07198d4e2627186eb97c3516738ca5a4d43810e3eeb405740ad1ef78fb56491a96b837ccd772796258700671e9e9516a965b7cfc6876e20a7f3b64c18d0d7f	2026-07-14 09:14:46.511	2026-07-22 10:41:01.149
jp0l3EphYrJ2b63ZFtxwE00eQFZF6bZN	4jkPcSiE1XLo8XjDPon3LlNzhvgC5cls	credential	4jkPcSiE1XLo8XjDPon3LlNzhvgC5cls	\N	\N	\N	\N	\N	\N	8ce880ae9dd64228d9ee801e4ea4e69f:366e75c376be342164c281d2584938e3c37b4785ee770f05145e17a0246175b9c70bbf95403011a867c494d8ba66deff01dda3cd57f1cae6fab99beb2f776a10	2026-07-23 06:18:24.467	2026-07-23 06:18:24.467
IJCwRecxbMkuDRkMRCPg7XcFQAAYnVlw	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	credential	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	\N	\N	\N	\N	\N	\N	40f3a77acaac06d284d4a1e93bdcebe4:c677ce4baf95705b98199b1d5861ca6fcf6c64b5d1f7eb7e0cd8c05478a82f6a7ac317ac50454361d0c653f3cb8c3bff4752c815b60468f285aed1eda8bf9fc8	2026-07-14 11:46:50.254	2026-07-29 09:52:44.758
gD4dLEYu30l7m5CVvCVRhAELGSImuy8H	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	credential	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	\N	\N	\N	\N	\N	\N	f31e0ecb11e165ca1c3680dae69cba63:925bb74bde45ee4277abaf8c2b3ff750ebd1384b5f0dfc802c2c05c19cd104382d885a03296a7e10c653dcb2a546d1feed75fa9021fdf6b9b66cf2782f68a8b0	2026-07-14 11:47:05.279	2026-07-30 06:09:03.944
4tnlnj2vkjMdOBazkCouTqnFmLVO1lcv	hLeMrXA5ZMH5AgfQZc8GYZm4pyrZ8dks	credential	hLeMrXA5ZMH5AgfQZc8GYZm4pyrZ8dks	\N	\N	\N	\N	\N	\N	fd0c9f6e8df0949c93ea5164c6c756f7:7865cd3fbd6ee6da170ee28ff7323ad95268b9be4fa13783940348a841516dc5cf6ffff38a0e20dc72b2215db8b09cb81fbf30a09eb7f10fc95a3e213556df60	2026-08-01 05:53:40.688	2026-08-01 05:53:40.688
mdLx8HlDjYQ1cU7WUURm8zQbQetnZHaG	DJffRC13mVfUWM0qLctUM3VmKTAclO1G	credential	DJffRC13mVfUWM0qLctUM3VmKTAclO1G	\N	\N	\N	\N	\N	\N	b9b536f2772d93be8a17211ea464a00a:d763e8d19b769d3c8526f8741d49aec50598424258784dd06db16666d3f212185cd69823bbfa0a32ba98bd1d5ae6b22deb60d70a210f181387d894ac4beef970	2026-08-01 05:53:51.782	2026-08-01 05:53:51.782
6B1NHtIW1IeRSHCbAXJ3v5sIZBqhgeuU	LmXP90ESDDr4ILDycFrWMPwdkm4V6IvL	credential	LmXP90ESDDr4ILDycFrWMPwdkm4V6IvL	\N	\N	\N	\N	\N	\N	46041a6ae4b8782e16f536302b370865:4b3d98c309fe11d26c78bf1ae573adc506947dd10213429a4f4871ff837af54bad88d1303c556bdd05d4be5ab343dfa4d0faf77dbcd3ff870a73bc7ff2f40a7d	2026-08-01 05:54:02.069	2026-08-01 05:54:02.069
zHRXf6StusOwS9DDr3x1FgupelqM366j	y9AwVdaV8REzaQZX08us34bF2DcMAjuR	credential	y9AwVdaV8REzaQZX08us34bF2DcMAjuR	\N	\N	\N	\N	\N	\N	79642b953edd01860ec9471910ce3b9f:3a9e354e6bdd05570b8cab7964f3643a071d3232d4245e73fc3b62d26386ab948b20f44d5bd65014969512677073b0c07dff7b9ac2c1260f984833c4cd1eab54	2026-08-01 05:54:11.64	2026-08-01 05:54:11.64
LSCmXeZl1W0Es6OUpjfVPJaSKi5foV1e	ZaXEKiTyC2AbpYNppMK8WC8palmUoOCz	credential	ZaXEKiTyC2AbpYNppMK8WC8palmUoOCz	\N	\N	\N	\N	\N	\N	5e96b858603a03f11631561803b1cf8b:8ca6790f7720e51e40c7dc64682ef7de46bf466dc3815a0c5086135c28fb3a4d4a68ef38db89b4239244232d864be5b0eb7786bb7fe6228c7f50c91b97be78f7	2026-08-01 05:54:19.59	2026-08-01 05:54:19.59
hKHfnuMnifmkz7stKvyeX9ylyqOIxGuO	WryP1Jst7akboXbIH8kidnUYiEn28Dkc	credential	WryP1Jst7akboXbIH8kidnUYiEn28Dkc	\N	\N	\N	\N	\N	\N	0423c19eddcdc266ca1e6571a6bad413:d3ff5260cf6af7969c4c0bc77d975f4269d792b464020ac4f2f88f4247783f528f6bb043a6bb12710833231abbf56250d6313499fb127d76be9a59eac2492cd8	2026-08-01 05:54:27.27	2026-08-01 05:54:27.27
GviV9A4F7p9QwRuWrbT4XPZmajBfTqn6	ThEHTj5EsetIHnX4yVCHWpccydwjRFQB	credential	ThEHTj5EsetIHnX4yVCHWpccydwjRFQB	\N	\N	\N	\N	\N	\N	762fa8b4d8a1d388ae236cb9d75d6f71:659891c3f5455a4b5b7b14966c636ac984b3930b1f0bafb02058f29ff770470abe9f89ae4f77a2aab7586834072748c986173985aec3242f996ff75a250ebd35	2026-08-01 05:54:47.919	2026-08-01 05:54:47.919
dNXFfW8P0gihn2YbpXSzy6I8czy5mBce	sAgfSVGUmIXsEyM9I4qy804Gom4b0o9B	credential	sAgfSVGUmIXsEyM9I4qy804Gom4b0o9B	\N	\N	\N	\N	\N	\N	f096a52985225909c5e5737625f62b9a:152953402b6274622f7bac8b0922725a9a82c39d6393d5f25440bc4d721be2f87de71189a38f8db0458589f3195136b50bb4fed91cf2cd4782d561c5c0224ba2	2026-08-01 05:55:53.452	2026-08-01 05:55:53.452
IaSzzLCDr0upObBOcy7GaeMnHBwLQ7si	56i2G5jlvvQ2xnyB2At4NLBaZGE8GRzM	credential	56i2G5jlvvQ2xnyB2At4NLBaZGE8GRzM	\N	\N	\N	\N	\N	\N	67cf97aeaf30959d3a11f6b5d7c37c05:9a20cf7a1b263da0211160a45f53c786e63f3817291f9179578f8f61516773947651d73b8ae43933f089fd20d4d5c6fab6c976d0559ed8eb9f41f2fd02f03e2d	2026-08-01 05:48:49.616	2026-08-01 06:02:05.779
3HkeXl9uAtnFtwZf8p7JwoaI0n4Oub9q	S5Dkn2ap2N3ETY8Qnx0q95hFWe0rWXBp	credential	S5Dkn2ap2N3ETY8Qnx0q95hFWe0rWXBp	\N	\N	\N	\N	\N	\N	d6917e3a525ef3c71c2b0a55a03353ea:9213115b4c4e7923dc7bcae38ab684f88a0a2df217a0f5083dfe952eb0ee30f32ddb9449487cc7252bc28ae150160ab36a12456aeddee21769c79f5f7fb6e1c2	2026-08-01 06:16:04.133	2026-08-01 06:16:04.133
sMzHUsYHhpEnkDXPciO4UOBulLNIaw8V	hzNCUhfxtIOBi8fZuYV6dNpRvXgZJEpK	credential	hzNCUhfxtIOBi8fZuYV6dNpRvXgZJEpK	\N	\N	\N	\N	\N	\N	e7389bebbba41af72802434d5510f71e:5e6bf1f605617fd7df569d8b56a53a9ddf28efcdc2dbb292dcc9156d5ed1f5e7ceeabf128aab11f98b610bfedad31a7e603d406f363b70e4c87131c44742047e	2026-08-01 05:53:34	2026-08-01 11:50:11.163
gBhGUSdqKJK5OuV1NgCZexPpWr9h0llt	iWtssW4KRlqMcyyeClwWrKLMn7wNhfJn	credential	iWtssW4KRlqMcyyeClwWrKLMn7wNhfJn	\N	\N	\N	\N	\N	\N	2568f03908a2b14da739029460ab4a31:59dedd01cb742737c359e418a4fbf9b5736250e98f8c3b83b3473deea7927fc7765fd1faf11c82757462fb1b1df4e8528a7cb575d674b06220845c1f4c615f6e	2026-08-01 05:55:11.919	2026-08-17 06:54:12.419
jNK2zSrjJ4iPrn1qzHmQKlhIWRqYdEk7	p2e4BUq5AzMQ9f8E5flIsq3KyGG8g40e	credential	p2e4BUq5AzMQ9f8E5flIsq3KyGG8g40e	\N	\N	\N	\N	\N	\N	3cf259354097e7e1dd06c07a36f862d5:2f0f62de5ac1570c334be96d5d99c8bf41c0712f36908f0e8e5d095d38419e601b731d7b74b634eff5481fd5778c5e131fd0340f8da73efe26a1133fba2ce61a	2026-08-01 06:16:00.487	2026-08-17 06:56:19.985
THDK02kFblKbP85MvCpTUPUpSFlN9sYY	fSeIkMaNgrSXK7xgHoOJ1NOOoBDaadBO	credential	fSeIkMaNgrSXK7xgHoOJ1NOOoBDaadBO	\N	\N	\N	\N	\N	\N	9928d5a10d3a84fbfc7a7cf156ca3723:e6293e95bd1139910734e9cc813c25e170d66e882941a30bee9ef561ea3a5572db4717d81831d130d623fb7e3375776dc737721a14e6197b9b319f31076845bf	2026-08-01 05:55:00.949	2026-08-17 07:10:39.844
RctDibh5pb0SfrYA4k0m5uu8i6Rfb2Ws	bvVcAKHJBjjzrlj1eNFpBfkeVdJCmFbJ	credential	bvVcAKHJBjjzrlj1eNFpBfkeVdJCmFbJ	\N	\N	\N	\N	\N	\N	9ed29e7ea8152ae897948be33df39cf2:9d2a9d2e67b8cfafe3eb107c5e395b4aa9fdc838b917a59252cc474c8726855f8926a35833180d389c8a6e7b305581d32036cb2081b83064d37128c7fc17f065	2026-08-01 06:16:07.288	2026-08-01 06:16:07.288
idusDq12rgHXxXmsLLPw4EeUFsR3nbt9	MzssomKGCJvFH4Cvn3JggrGXNDnDAj2H	credential	MzssomKGCJvFH4Cvn3JggrGXNDnDAj2H	\N	\N	\N	\N	\N	\N	ee34a28416a2d8d8d31f641a29828855:f7a2d66835c4ba564af1aff199b547c2c3f828fc73d71b8c531d7adf540f9a410e5751ffb81f6e595f400afdb0d9a23e643f2123fe9b1b61c2e98010d175d03f	2026-08-01 06:16:27.459	2026-08-01 06:16:27.459
6c5lbsDiayHmEjU6XPhlt3qaz24yiZnb	JeKpjkKNOQD0M8LM2IAjuOPrXXgZiDha	credential	JeKpjkKNOQD0M8LM2IAjuOPrXXgZiDha	\N	\N	\N	\N	\N	\N	ad21957f3f9bf606be0648c83168c738:89f0a1d2ab616f4545c7b4bcb7943e909b4207b678bffee9b24d36eb71332c3e10fca1207cabfcbaad4ae67c10a7c9cce696a580cf4303913e3d90112ceb43fa	2026-08-01 06:16:33.952	2026-08-01 06:16:33.952
FBY7tEn6kd8s063ZeSoumW9xGlRlEXWn	sG7rpE0Z8Wq8gXkvYZPhMc1Xw2PEeclu	credential	sG7rpE0Z8Wq8gXkvYZPhMc1Xw2PEeclu	\N	\N	\N	\N	\N	\N	f98f1096ab2bf24b88da21f095ad0b02:105ec8b6bffb538110c23a7dc466f0f4db4e3e7a6e8e7dfd56efcc145f94a4e1955ea370e52cccf0295dc5bfe64b5c40daf7aa364450eeb997b5c17aa5df9cc7	2026-08-01 06:16:40.897	2026-08-01 06:16:40.897
tikHaXyrNpFHCGtvbGJIZV9zW1WxyHh5	IdCdOWQrCJoPBnmSTG82glvQY6W1C7LL	credential	IdCdOWQrCJoPBnmSTG82glvQY6W1C7LL	\N	\N	\N	\N	\N	\N	82691f0939e9366358467d39b89549ef:310415a863bcdddb095361e692bc6fbd7d5e8ce4b4054dbd81ebedff488141c5530350a9bcc5359c2fe284aefead599160ec08313b3da6219b3cc3590832aa74	2026-08-01 06:16:46.955	2026-08-01 06:16:46.955
5Y6Yf3FqkptV6Lgq2spnUJuJtL0Pg0Eo	g49vlAvrPurduArcWzgovY1HZDlNMTxl	credential	g49vlAvrPurduArcWzgovY1HZDlNMTxl	\N	\N	\N	\N	\N	\N	a80bd58f4e2084f3bc6e0bf05db71eae:f54c42a0a1bae68ca122fb651bea14b2b4dd2fe1be7e9226715045d43f6ba09f0d86fafd5cd15dfbece2fd09dd7198ffc426dc34c5a6b01ee7d149e1dc5aee5e	2026-08-01 06:16:50.063	2026-08-01 06:16:50.063
eMlF5U1ij8MdOlewd0ZivNR9JkQVj8l0	qHthSYs5gYaR6vgGwvqnarnNPcq2cF6l	credential	qHthSYs5gYaR6vgGwvqnarnNPcq2cF6l	\N	\N	\N	\N	\N	\N	8202bcf02fdce4792ca6dbac2656bd7d:a97eff05efa846766962ee75c91c2e364f7ccb9bc2942f07948c1b4004d6116fdc02329f0c55db16ef3ac53d7dd92a9151138201e81f2830f72205c0c5059f0e	2026-08-01 06:16:59.413	2026-08-01 06:16:59.413
TylzGg5FqMgWeFySmASFQViTjxoUn7fJ	Oj72twF3RCSaaonS5VDoaWMnutnsMo6H	credential	Oj72twF3RCSaaonS5VDoaWMnutnsMo6H	\N	\N	\N	\N	\N	\N	5b741a87c7a48f2f1dd7da440283a380:b0ece2ddb9ebd9d4349e47212fadca1a19bda4faf1bdc42af1f5d8ff71cc36df198c1f3b5d56f1562cdcac76f5f291cd0bc8a7c873f78bb6f98439268a06d8b6	2026-08-01 06:17:05.368	2026-08-01 06:17:05.368
qfgx9Txo4FyX9uDYSwFMylX2Y2isxsFI	ywPKfKGO0ML8NdzjqsZorbJogPj1NXDK	credential	ywPKfKGO0ML8NdzjqsZorbJogPj1NXDK	\N	\N	\N	\N	\N	\N	66959d5cea45d47f3be0068c8a91037e:bb21e103423cb7529b81bbb4d6613a6f83fa778418166c573a650cc7729092de569c4b2697b968ddc2ec2bd16dcd88b255a65a12849ae8709164e2d61df50ae6	2026-08-01 06:17:11.586	2026-08-01 06:17:11.586
l6Qzrme6xVB44MKLlKvTIAEYRJxTNFXr	rRIkKhEGpxpzgjoKcqUg8RTyxhtZWZUu	credential	rRIkKhEGpxpzgjoKcqUg8RTyxhtZWZUu	\N	\N	\N	\N	\N	\N	173c22505e5fec1a959f8fac97cdbb45:de0ac7efe2702c2a0013937a30138b92f2d38fb745cfb439e2a3e77a4da2419161e482aba5d8955714f21f7fc8d25eba081b0b3d89f16a1c36fc985fbc06134a	2026-08-01 06:17:17.289	2026-08-01 06:17:17.289
WrSKPYsQ4GFO8r28Pw84zhAvZaqBb4yl	7I5EPuFnqqNWFwdPCfcCS5koGv0LG0b4	credential	7I5EPuFnqqNWFwdPCfcCS5koGv0LG0b4	\N	\N	\N	\N	\N	\N	f3c679d396b323481ec22ac615b242b7:5773e6d870ceb89020893035648c227744ee6774fdadcd08d84bbed3cfd86933358912400037250f3ca20fffa4991cd60424f9bb3aa0891d103ebd15cb31b330	2026-08-01 06:17:24.358	2026-08-01 06:17:24.358
6W3YZYLRUFvsnowUXck7aeLHPbdDDR3Z	wfcpIQGrsKRU1hrCkCxj29idqnSxNn9A	credential	wfcpIQGrsKRU1hrCkCxj29idqnSxNn9A	\N	\N	\N	\N	\N	\N	0d0fa3439ea652d038d5f6c7f622490d:cbf9c1288bbf97e3847e76658b449c6954de193fa014474fb2f20b70ba7370b6012fc3e692c2f09ec9fed93f1df97591419002942878cc672600f3635532bb5d	2026-08-01 06:17:30.193	2026-08-01 06:17:30.193
8YxGcJYIwkVM1CdUu78qBjWyz9dDmKJw	dEa53V8MYFoGbxP7GuKUptpU8Dayd0hm	credential	dEa53V8MYFoGbxP7GuKUptpU8Dayd0hm	\N	\N	\N	\N	\N	\N	abda029ee8865908b27e2f18b03961ff:052da5d55e0bccbbced8d05a29ff9aa6fc7ecbf8dd9faa3db053844cbb7d4a4669b3ee45bba57d0e1811e785b3d58bdcd705485c5c22f2eed156fa9bbcf5143a	2026-08-01 06:17:39.709	2026-08-01 06:17:39.709
udvOa4Toqc5x9a1IpZ9ALaGVjncSh3w2	vBWXujbcpc0s3bIoXSzYz9smtUiQB7Zz	credential	vBWXujbcpc0s3bIoXSzYz9smtUiQB7Zz	\N	\N	\N	\N	\N	\N	0d74ed679e6699838087dd229ed3da2e:326ca49e787161f48c64c34fc0ca7d30170b266b5b29371c78bc078e778aadcdae0bd9313f393aa231f4ce619b22ad89fcfa272bdf1d327546ad01e0d315876d	2026-08-01 06:17:46.009	2026-08-01 06:17:46.009
QK63s934Ch0l9CL4gUVRGX9UjXJkGvA8	WuL6qppGqTBJqO5De6CP1pmELvTrkewo	credential	WuL6qppGqTBJqO5De6CP1pmELvTrkewo	\N	\N	\N	\N	\N	\N	917c1424d101cacf9d5a2eebff68ad3d:ccd413f1c444974f9a58416ca149baa247e4914356981886c48366554bce6d5d8851862938f10d9c691d2b3ddd5f02708ff0d26501d4241a9bf56309d718638a	2026-08-01 06:17:52.225	2026-08-01 06:17:52.225
L6oODwb8hlnNmbUGljs4Cw6VdHMjVbJy	slG7X1kSLzd6RbuLwhwlCFfAZS7q7wwm	credential	slG7X1kSLzd6RbuLwhwlCFfAZS7q7wwm	\N	\N	\N	\N	\N	\N	0747d2679bc699d248d8d2cc5600f83e:25ccf342e7aeb03ffec17d6fa616c8d9861497bf70bfdae5dd6cf51df9c111657ea667eea8e319f407fc1f263b4d55bf47b55130e2c4866a2e73c76115989d94	2026-08-01 06:17:36.529	2026-08-17 06:57:57.795
KM7RJJwUK0QMCtGHN85nW6hv7sSYciW3	6UsDRP2gK1LCSYm15BlTRPU9YESdKMKo	credential	6UsDRP2gK1LCSYm15BlTRPU9YESdKMKo	\N	\N	\N	\N	\N	\N	224278f2ace73e5b19cfb7216a7ea219:7d5e58f70a218435af06f3148c0cfb24e9e9c0a146aca159e6dbe4acac7dcd1c6f6a9dbc6f526a14cb7fd302a1e9bc794b58802140817103950c3d2297e98469	2026-08-01 06:16:10.459	2026-08-01 06:16:10.459
448kai5op2wo2k0lELVhtYptuQQTNDGy	bM83dg1rAM0UVAvfTneUPRZX7snAv4vo	credential	bM83dg1rAM0UVAvfTneUPRZX7snAv4vo	\N	\N	\N	\N	\N	\N	07e0d6b05ed0a64c5e3c081a214c176a:57de44904e27fb7ff9a74625a62e1323798bd2e21c210d39de3e9e4bb8d8fae66ef6a19444fb14c9e526f5ab3a61af9b0bcf4d9bdb2149db874be0100fb74085	2026-08-01 06:16:14.104	2026-08-01 06:16:14.104
NBMSfVNB5PL0hi0feNrLp0UeJVj3ZGRx	ZdelJUtCi4MIyrqsOYzlzu6qHP662fXO	credential	ZdelJUtCi4MIyrqsOYzlzu6qHP662fXO	\N	\N	\N	\N	\N	\N	2cdded354591757635fe8361d5c58de7:86fda5045d155243e2cf2b40ec17cdecbba04d9aeb416c0bd42bd283f1801f9552f7f314e6ec2402243513ebb1bdf9de63c64f7d80a78444616ddd440f4f5c91	2026-08-01 06:16:17.81	2026-08-01 06:16:17.81
CyyP9DEUH7hkbOHAzzMyHK52VWtX5Ion	4RlM0XEcby4dd3l5LcsTzWvqqXWLGiX8	credential	4RlM0XEcby4dd3l5LcsTzWvqqXWLGiX8	\N	\N	\N	\N	\N	\N	6b18952428c81359d4be07125a7c8307:2626df8527dcdfae86247b92c35ccb01fabf162e67223c6dd4af9162c30430b28b745807739bb67ab16a4d697134ce780e3134ed2dd26de838537a4f272db8c6	2026-08-01 06:16:20.73	2026-08-01 06:16:20.73
hyDT2ljCIcFCGy46fnJu7ZJlw6sjLkrL	TmMMuSm4RxwiYdi1eTGD8yBSiX4zHIdQ	credential	TmMMuSm4RxwiYdi1eTGD8yBSiX4zHIdQ	\N	\N	\N	\N	\N	\N	4af43fbcf09e6afd68eb5f3b3af7a436:63498aa0ed3592c6bde076c4123433935fffb2313f1eef2a540762589e55ba5f6e594a3808806ec42f5e008636c4021181dba596ac6b747263155a7b40038c4a	2026-08-01 06:16:24.288	2026-08-01 06:16:24.288
ffx4XBlFLwhhwfR4QmMxeJO1ZS6AXMBU	6lJNa4T9alzrd02uUbhQCtSIKt3ys1I7	credential	6lJNa4T9alzrd02uUbhQCtSIKt3ys1I7	\N	\N	\N	\N	\N	\N	74fb92d3c57189309d3f35bfee614607:6b1d3dea2ce18e20e411639ee08d7c8c2c8063b2b4a28480c53e92161e31d524af5fb8426d4d155dbaffe0f8237aee523ebb277ed33eb9cb7809808acebbd0e8	2026-08-01 06:16:30.871	2026-08-01 06:16:30.871
W9f6HMmF97vjEhCaO9H9rsK0G03gSNPg	bsMHslOvNMdJcJmzosFHaZPNAUoXM4if	credential	bsMHslOvNMdJcJmzosFHaZPNAUoXM4if	\N	\N	\N	\N	\N	\N	ac874817f23a9aeb0838f5445d5d81e4:c170dfbd7bf7fa378c0ac7be16ed44a0aa6fee3c3f6972e30d31c8b064532f87dcbbf5a3d88685cb3ad879b738de784a06f07b9a2a58dc69dcbe64f3f413cd0e	2026-08-01 06:16:37.567	2026-08-01 06:16:37.567
1ntbpBnQoboz2x9HQEfXz8eTwpVcEMEc	xdghzjTgvlyzH98CKFlSqDqVtKxNsaV4	credential	xdghzjTgvlyzH98CKFlSqDqVtKxNsaV4	\N	\N	\N	\N	\N	\N	3f02e65968eafaa12564bfffbd7d64aa:9c762aee583438ed0df23b99f3c9e0edac8a760c0b9c853372ae66ed29221690630350865e01f119a44cdaaa6ed9cff41e26c3767033ba3899b0273b1249b6f5	2026-08-01 06:16:43.872	2026-08-01 06:16:43.872
qJlOSNalTt2dUTNW7XyNmtvmadQsD1O2	Mvwfiy9txZXzOAAYrfwnaLt96lEsUGzc	credential	Mvwfiy9txZXzOAAYrfwnaLt96lEsUGzc	\N	\N	\N	\N	\N	\N	821044695fcdef1556fa6cff66e9f01b:61dd21c21cafa5a9993e747f366ff15a82a62ae252f80b68e8a1b3d73cbcb677d0b36b7565dab3e630156ad6a1b62a4dfee2264455afafbd6d13de57c1eb730a	2026-08-01 06:16:53.03	2026-08-01 06:16:53.03
hWIa8Ya0UVBSg2oXuyS7Es1XpW8wJHZs	6qoYlfcYwY5n6D65ABwcvuMPsO5Yx6cb	credential	6qoYlfcYwY5n6D65ABwcvuMPsO5Yx6cb	\N	\N	\N	\N	\N	\N	c67ab50d7d5fbba76d72dfc694729bdf:a778ede2d7d9f709b60b2fd9b5a359b3c43f39a367e4e6c31b1188093724897fb7a11af49ca815ae3bb3e8a84e609f97b20e49d847dcf97ddf5be1ce40554053	2026-08-01 06:16:56.622	2026-08-01 06:16:56.622
yRzW3TjArXUreQbK8l7aSkSR69ZSw1IH	Iu5RRoqCbs1TzGTCY602U8xrbung5QTg	credential	Iu5RRoqCbs1TzGTCY602U8xrbung5QTg	\N	\N	\N	\N	\N	\N	242123c358b9a9bfc4c0c235f084ae27:a65c12c599de52b4c1df22077ebf9a90aa520cc19a2d8541e8e82505b59c6e4193588fa40002afe3af3eab0277ae74a22218b0f5c84d1284ea8282e0fc16f2e3	2026-08-01 06:17:02.354	2026-08-01 06:17:02.354
FgQoRkKlKygiSZF0kfUw06xE2vEPQx9e	R6h7DbBNudQ0zxU0AMxkk8JkWVKH4lFv	credential	R6h7DbBNudQ0zxU0AMxkk8JkWVKH4lFv	\N	\N	\N	\N	\N	\N	ca3167d2341667dc93603a08655bba33:60bd9d9b5e82a49dca3f630ca5a5e15873284f89337856ce1352e82ffa5f765d212bc9e436505b8b8bdb32da82c006045f67327f202a08babbcd160484cc8e00	2026-08-01 06:17:14.588	2026-08-01 06:17:14.588
IuFvQFM64qjN5qhHgZpftpk5KAaR3a58	Jp1aAIrNr5lmyBuWpBFyyprL3olHsgYR	credential	Jp1aAIrNr5lmyBuWpBFyyprL3olHsgYR	\N	\N	\N	\N	\N	\N	04b7a3bc54b8b3e585dc8ba47dddfd92:e85af5f855f20f7b627463de6100c2b5792d41402442455548fa8f6b0bf741f26001b857341f021c5ac571798e09b70d30ffe6b8b7beb9885ce5da621da969e6	2026-08-01 06:17:20.464	2026-08-01 06:17:20.464
7obZZXSmY3BlfLfD6cOVJ3769DWDHiBR	ZcetNLyDLsCFENzy8GGsifvgKo4wxlkw	credential	ZcetNLyDLsCFENzy8GGsifvgKo4wxlkw	\N	\N	\N	\N	\N	\N	1346536ae6a90a08041761f6e7e2b2fc:d85dea57519916a491356e7727ae4ce5318468d6190aa11111709bef6236aa32384c99dc07ac120cf19e30632b8d85c70cca7baf6be6a79a39aeb6f37b9ff265	2026-08-01 06:17:27.428	2026-08-01 06:17:27.428
epLXlNeRWVfJrQDEeSGB3Y5HplrPHsFA	BRGSLp1aIioqWyKHoSsnmwx0GpHqacv5	credential	BRGSLp1aIioqWyKHoSsnmwx0GpHqacv5	\N	\N	\N	\N	\N	\N	c44d0613f1179365023471470c39f43e:7f0ae90c77ebe0dcc8bece15ee38a5693d4786d6833da953386bb89b2a6fb3fa0e7644a07d3f611d41d122cb84fd7e5c569cf331e1cda096f82b5540b3c35198	2026-08-01 06:17:32.924	2026-08-01 06:17:32.924
LUZwM6qu9p9MOer7JU5kjunP09LzouCn	PsmB3B8gWSRGwQAjBW2jwPBmPcaXSLfd	credential	PsmB3B8gWSRGwQAjBW2jwPBmPcaXSLfd	\N	\N	\N	\N	\N	\N	9f63a79eade48bb86f438ff81cb24762:dd922ccff6fc944c9537a4ab22648591808a12cae06e15e8b764b60b41b43a12dc06573d653e96502d2211e946932bf88fa73fbe97a3f7b03accd5c40d5556ad	2026-08-01 06:17:42.453	2026-08-01 06:17:42.453
Acyt1a8THIHHTtXMS7bN5zki9TdydGZ1	rq93SK8Zy0W7zJkpb0RACVkKbKqDQIch	credential	rq93SK8Zy0W7zJkpb0RACVkKbKqDQIch	\N	\N	\N	\N	\N	\N	825e89cdcaf8029e69acb3171c782e29:b9315687000cf86edc91f6998dad7f70bc7d23acea2ab54ac467e2a37f96c972e4f7a422ceaa61087d452c15d2e3dae2e8d9a1eba8a905d49cde6e07026cd23f	2026-08-01 06:17:49.358	2026-08-01 06:17:49.358
kGf6e4B9n53A7GgqKrIx1DVFgFOXvl4y	MPvF2gvOtlVFAuZi4sZk9CFYrMSuu5wE	credential	MPvF2gvOtlVFAuZi4sZk9CFYrMSuu5wE	\N	\N	\N	\N	\N	\N	23d079078f6ed3ef3ed1c894d56be68a:ddea9b23f50c32c20c4b01ab1b91b20fa22078fea41d40a36ee57d7874d28d6106e3f9b9a43808043d0b1741b28d356d1d5a7b43576d28e35169a1dfd07d5ca5	2026-08-01 06:17:55.395	2026-08-01 06:17:55.395
diSZ7YwP4tpdYfj3ZmAqXlC7bOgpIeM3	VshdvkNW6AmNIXKMBEM1inPwWbk7BN4a	credential	VshdvkNW6AmNIXKMBEM1inPwWbk7BN4a	\N	\N	\N	\N	\N	\N	a7c98b3a27aec3e78a9206d8c01e0f53:fad8e2547b89440c17e7df66eec4eaa49997cadc86c34c2279dbd9a662d3f41ad639ed8ff316bd3e9acac74705ee9512434cf22df3de32245ea83199ef695606	2026-08-02 15:34:39.668	2026-08-02 15:34:39.668
5S3EHIRzfSTbLoiQL2E6LePLac3M8Kpp	P156rgOwPYsPRQ1z37cmWWPrLvnW9ynY	credential	P156rgOwPYsPRQ1z37cmWWPrLvnW9ynY	\N	\N	\N	\N	\N	\N	05fd74fdf762bf54a4ee055d26300263:8a293c3e09836861cf1eb3c20ea7377009763457384059c49b1395e293e218b2c5d622b9786092463aecdad8e0908055971b9cb31262247c802bc8cf8fb1e4c5	2026-08-02 15:34:53.789	2026-08-02 15:34:53.789
i9D3NlUnJwbZTXDuN43zOb4tgEssKyn6	UDgqsJfXLPFztSZvIQSYS05fcrEXp71D	credential	UDgqsJfXLPFztSZvIQSYS05fcrEXp71D	\N	\N	\N	\N	\N	\N	2ef8f48ec07c47a30c46c714f6447eb9:2e1ea3e8809a2e745fea8b66c138cbee14597af4dbb86ccd08105c47e563e563ed55e64b19c25edf63e201fa8d568b547ac6ff1707d672edfe97ae2059feff24	2026-08-03 11:44:57.479	2026-08-03 11:44:57.479
AAyA53Y8vN7D57Vyix1S2WmEDtsQCfoz	kakfwAdbxtkKfV6a5amlHHc79bs7oWNC	credential	kakfwAdbxtkKfV6a5amlHHc79bs7oWNC	\N	\N	\N	\N	\N	\N	cfc9dccc0b2e589403e1efd089a3d7d8:05e51e60ee3af93294e22f77be34a5c787f105e8319b7a8cd5a25e4e822627a33f597a0f5951c6833ed22721a280cf3ced0983d6ee44b4ba7ced6216e63192af	2026-08-02 15:34:46.289	2026-08-17 06:59:45.946
eSImYfnyqaAwscoW9NvK0MpV2NJy1VpZ	Znok1nrEYDS5L3ccWY3SjvmWbxvBkHpG	credential	Znok1nrEYDS5L3ccWY3SjvmWbxvBkHpG	\N	\N	\N	\N	\N	\N	315e9262b832a8ec3655aff367de565e:ade05eb6513333a66abc49c4479047b1527867057b127527b0f23aa704b2af056c13731831749ad9ef7f112b25095ba338e09a8c808dabdb0753f63824b6ed3c	2026-08-01 06:17:08.65	2026-08-18 06:09:38.525
GB8JNDdpZ8kTMdfxDspZzXrYEfkVEtWi	YLfOZqe3qKI4h1Tr1yBNA6HMNVdmBru5	credential	YLfOZqe3qKI4h1Tr1yBNA6HMNVdmBru5	\N	\N	\N	\N	\N	\N	9bc4c9181038fbd2af99290f8679faed:25bc14dcfe142a8c2ffec30787aa5b809d233357cd20332f432c045c606c2bca0df6ea08a4684b91dbbe3900bc33b8228397ff280c1c607ea16433f79638a15e	2026-08-05 11:29:52.14	2026-08-05 12:04:24.558
3jaiilVN1tzb1FeqP39ob7T3FZWnOwut	tvmUWmsmTu4QRfQn5ihKx7EwK3K5feLY	credential	tvmUWmsmTu4QRfQn5ihKx7EwK3K5feLY	\N	\N	\N	\N	\N	\N	73fa682004c0ce8f2c4de040e68a630a:62ff1c8bd9ac6b74a81efb7db774cc7423eb903405607e2d4db55087cf25225fd0a1c8b46456a5469bab3805c6e83ee38f84af562f6d59e3bdb1c426f6bc3773	2026-08-11 12:01:55.749	2026-08-17 06:56:20.316
HyGktyTyROwpzkmdG0ssn96zRT0beHYz	6c5Lb48MdG0kgFKKZIpv4a6uJtetrU5m	credential	6c5Lb48MdG0kgFKKZIpv4a6uJtetrU5m	\N	\N	\N	\N	\N	\N	9837310d7e53398f27213e22c21aaa29:c4baef2b6b8b2a324d214758082b44cd318314880c78e1dd42eeabfbc3f503c3d947a9695bb6b6b2137ccc2720db72b2a9c090d4b2a6f62b4dfc08edd6b49d13	2026-08-06 09:53:08.218	2026-08-06 09:53:08.218
jtY6a9dGmrsDke5Zmdx9u5El6jyMOEgR	GcZYGD8kusgbhHZGaNvTCCpZ8GISCgCc	credential	GcZYGD8kusgbhHZGaNvTCCpZ8GISCgCc	\N	\N	\N	\N	\N	\N	a1b1bfc529a5ee283319618e05af1b9e:59a78ec66fd34437cf579b644025154903dc05d44ce43d374c8b663b5a2817ded8ef2dc211d9b5aec268958db0680efcc1cd5c182fce27198470836565b71833	2026-08-05 12:12:16.948	2026-08-06 09:53:26.393
QaQzMJzFRAVQYBCLfc8FnZAAqwEfQD2B	W3IXn5OnScTi0oYEXkndY6je4xeECuCe	credential	W3IXn5OnScTi0oYEXkndY6je4xeECuCe	\N	\N	\N	\N	\N	\N	545217d89270d7f01933383ac22ffb94:2cbcdff140e9b82200a59e5bc2e7f81860b17f92f1863337b7b117e392ff218d7d79ffef2e641590b0294410b8592b0f0a6f395b8c2f90d734d421a7cc933071	2026-08-08 04:41:47.892	2026-08-08 04:41:47.892
b9DQnGV7ODVvvXYyYguQ30djOFaAHf8E	CDrlnxvl0gz2iI92SVPG3r24lbmKuQDj	credential	CDrlnxvl0gz2iI92SVPG3r24lbmKuQDj	\N	\N	\N	\N	\N	\N	3e9d4908785a427190f457cfa9f50d89:ab2d74caccb31fa2da66f9554f55618994cf3b9f43350cd9bcef6c7f9ad59acd5bfc0d7fe2486c290b5182555ce557e109d00cf7023b693e20e6b7aac1303cc6	2026-08-08 04:41:51.791	2026-08-08 04:41:51.791
pV4FlB54RYeUXKj1awMZ5FU8U94IxPik	QAdA6wgcDYE7415AGv3588dCBkL8j0U2	credential	QAdA6wgcDYE7415AGv3588dCBkL8j0U2	\N	\N	\N	\N	\N	\N	9646cfcb475610f334b09b47936cfd03:c4e709f1505a9adf41b7c6e53a6789a10be60ef4c9ffcac38ad66283a0c73e37726465f26d8f274ff57c0931d4f5bda06716cf35ca606721d19d072c9dcf09ac	2026-08-08 04:41:55.977	2026-08-08 04:41:55.977
4AGrD2kIUuYirj7fXmidbhKtnWlrmLGE	RIn7m1TvxUFLcQX5qbB2qAXhsRJI2cgw	credential	RIn7m1TvxUFLcQX5qbB2qAXhsRJI2cgw	\N	\N	\N	\N	\N	\N	5d5d6df39999dfdfa18341d4ae22e6a9:92d31253201b54ce5366338bef033cd7b1c0973bbfbe8adfc0345f90880d5c7c09bd19af3da13256e266de68bed830bac20ab3b73a09937bba6e204e62826b9c	2026-08-08 04:41:59.934	2026-08-08 04:41:59.934
LCfat3FooO2l8XrowQEJt6rz1KfUNUGv	L3WMvTNS2mdndTCZEcVqZ9VkpVSajcdP	credential	L3WMvTNS2mdndTCZEcVqZ9VkpVSajcdP	\N	\N	\N	\N	\N	\N	aab7527335962f8799975e1383a4f55b:e39eda8a30956e647ac2f56575b178cc8f021e199917b6fd9db056e093af2938b3fbbae38fdc746a9ecd3788863a733a849cb7c92c635adf48e3ad38f9753a94	2026-08-08 04:42:03.355	2026-08-08 04:42:03.355
40ervsH5YfzpKny9M10QJ8ueiWbTscUO	WPp13AvKWw6TriCwXeH1eUAFfLmp3vqR	credential	WPp13AvKWw6TriCwXeH1eUAFfLmp3vqR	\N	\N	\N	\N	\N	\N	564270363c638f546321b95e4813dd4e:a7d8ceb65ef02ae32ba0fbb7b85b0cf9637c09043ecb8588794a43ab4af32dbf49fa15ad7a3c2b3a94ca6c863b4df8e50554ad042cce1927a7ab1a015b27c03e	2026-08-08 04:42:07.204	2026-08-08 04:42:07.204
sWn5KfPJv7GIQu4lcls8vxy19tjn4M4f	bZgbdSln4Oz8EiX4SSgQP2AuCZiO7FOl	credential	bZgbdSln4Oz8EiX4SSgQP2AuCZiO7FOl	\N	\N	\N	\N	\N	\N	7893ff91c11c3a68b142863d1a15a45a:ca84857bfa739a41d1095d09043043311ace130c1baedd61aa82cb2cc0319940a98a12b7db83a1b4c3d7c18873e503257e5d4155e14e296fddbbc723ede8ecb0	2026-08-08 04:42:10.47	2026-08-08 04:42:10.47
jqi2mtQaO4zHhbxdzvfHLS1RqJW5LVDe	NAZC507s8SFupcMpw97HDToNxZhkHGvN	credential	NAZC507s8SFupcMpw97HDToNxZhkHGvN	\N	\N	\N	\N	\N	\N	ee4c9902e474778e212da0024adcbbba:db673ece3f694b7a88de18da775ffb0a704069d8444ff2fb8ebaea404f796b81f7291e8562e25c4a5b4e0c5f3483b5e3abaa1d1f95cb2145f581bfe8b63d6dbf	2026-08-08 04:42:13.505	2026-08-08 04:42:13.505
rMgAVGxw3GGt0Wa3fNM2PPsEze6hesKx	QETCIcKL3L2Dt4X2Hrd4hAH7U3DLYxtP	credential	QETCIcKL3L2Dt4X2Hrd4hAH7U3DLYxtP	\N	\N	\N	\N	\N	\N	10fde5c28b665afb6806c574f240655f:d02b24d4db2ae91773ef55c01cee63ef5c7ade71cb2b9ccfdecf82a82c3e69b26d8f7a2b5ae5f4c72bba906275bd221f9cc9073b7ce178562fa11ac586e95539	2026-08-08 04:42:17.186	2026-08-08 04:42:17.186
rmT3yqxG63GPp0JZMtOgCNKIv4rDkH4v	ls6wA2G0BeFv6mmbuaKGz6KwNEXr5PDt	credential	ls6wA2G0BeFv6mmbuaKGz6KwNEXr5PDt	\N	\N	\N	\N	\N	\N	33d9f09ce0cd897712c231ee3200d389:dc9bd294b4b252d4db9f5a943593f12cef3285143964d2b5dbf1b1b0d827713c359f086d6cda0e7b9b0c3eba84ef5f660ac32dddb36b1809eb064a6674919011	2026-08-08 04:42:20.819	2026-08-08 04:42:20.819
wisvtUxCruDNh0aZxqtyXklhD17kLuYD	kKiWhq6S2aKO6UuY4XwPxqrjc8a8t1Lq	credential	kKiWhq6S2aKO6UuY4XwPxqrjc8a8t1Lq	\N	\N	\N	\N	\N	\N	48106ea25940c093ba140e5e27d80394:dbf2ff5730030f0615275c5b3d6b529bbb263f5e4ab44ebc211aaa76b302310aa4285eeed5bde9d92057a6ee1ffa951f94a55986b5f109e4e73cab7f8d01b531	2026-08-11 12:01:26.746	2026-08-11 12:01:26.746
wy2BXkGEs0LcZdxmhE5jBc00k7Nu5N7X	i5gQtoQNWyOtx0W397TNVDGi29dcICk3	credential	i5gQtoQNWyOtx0W397TNVDGi29dcICk3	\N	\N	\N	\N	\N	\N	cc87e075f42d8fc7d06c0aef3413cbcf:783d736d27b680fbc375f0d293ee177720279083a4d72007f2abf08af812c144c0203e29b3dc8d0ec070c06d40b0d4bf3a59c1f86a8be227504d6651582dcef3	2026-08-11 12:01:31.345	2026-08-11 12:01:31.345
Dug7gAtX3ieWa9hcmOs0hupzLTufeYel	et5IzBSiRKXV9nb7NxCa4FgPJpIZHCV9	credential	et5IzBSiRKXV9nb7NxCa4FgPJpIZHCV9	\N	\N	\N	\N	\N	\N	4fd2c2e5bd2d1a58a171b38682bab048:536cfb5313ffd7ed134f87391942f0bf300b8f65146406ae172306aaee25eb592486499c9c8cd8ee8aaf82547ea3b3b3caa697de0a31dbfd7dcb2f4769663fd0	2026-08-11 12:01:35.354	2026-08-11 12:01:35.354
CjhqnSE3LrM69LpOn8ekeSHygYQmaYQc	UzN62yhXmDIolOr5lveTXMlx1HtjWbuT	credential	UzN62yhXmDIolOr5lveTXMlx1HtjWbuT	\N	\N	\N	\N	\N	\N	f24dd68f459f40beaee15e95b0605b0d:23e9add2fc30759d99c79565ad476636c45846215c2628aebfe6f8fb15dcfd63ff91b7cbac668da85508129f8127c876560e2ad1142b453033388d86316dd0a1	2026-08-11 12:01:39.984	2026-08-11 12:01:39.984
DiJ9ACmuI3TvsIKCtQVt264aUbvw53FK	37M2hvuLnOERyCrLD6Roe95886g5Icg5	credential	37M2hvuLnOERyCrLD6Roe95886g5Icg5	\N	\N	\N	\N	\N	\N	77ac625f4b350ba3e6580f81dc07bf50:b3aff3ae298e3aba0688a9c9b28b79b0702eb02ee25d991cef7c048216bc3d544d19217043f3986d6890d5054cc02917fe077381a37f545cab54a4562b9da096	2026-08-11 12:01:44.658	2026-08-11 12:01:44.658
Q99kkraik7QnY3APmGNyDy97kBuoVB8n	YnKzIEKfnfr8uEntgPnMtHHzYQ0z4LNJ	credential	YnKzIEKfnfr8uEntgPnMtHHzYQ0z4LNJ	\N	\N	\N	\N	\N	\N	006b101cf56fa8247ecf056e4d9257dc:b03a8a7cbd7e155adf01d75fbd6bb5f25758f0a7b139a02c1c558d793727be9ff8640228b01b6a55b036dca9f854384e64b08635f3693cee1c6627db30e82d9d	2026-08-11 12:01:48.526	2026-08-11 12:01:48.526
buHQ2Er5XapMgga6wd3gOyyjIKHvwtJA	ipSluCETdB9k152UZqk6LC5azIl6phbG	credential	ipSluCETdB9k152UZqk6LC5azIl6phbG	\N	\N	\N	\N	\N	\N	2480e248859ee0f843b9d3d7020521ed:907213a576553de331a4ac0d60179687aff4d81804f83b2b2a047cf0c781cbe025919c5fd4cd0ee38abbfe378a7f215be9629ebd3884bbcc42de3d069f6e7962	2026-08-11 12:01:52.23	2026-08-11 12:01:52.23
ZQ0El9KCUJUBT75RoR6MzlxeLGSrH8cf	Q41cuVZ41NsKrjn0CcFrcVtFkOEHB065	credential	Q41cuVZ41NsKrjn0CcFrcVtFkOEHB065	\N	\N	\N	\N	\N	\N	7e5cbb1ffde3fee1fcd81698545fcd9f:d46f6740fb8ae3f3c612f2c152d79fc24d7d426e1c9f45acd56cf794fbf54c41c424c4308d4643c6b538c18682e267567c249b2c606049e27957c73905a1f38d	2026-08-11 12:01:59.75	2026-08-11 12:01:59.75
bTRKIVXdBw8Gs8bj459veWpJD9sl1wUI	oEnbRUnPCWvmKovJ1hq4JvvPnDtdmDhw	credential	oEnbRUnPCWvmKovJ1hq4JvvPnDtdmDhw	\N	\N	\N	\N	\N	\N	2b7c0c51862c077d41528029fb246dfb:272b8585d78a0f99ea3c57fcad7d45da37b3ff7e105864d171e0d377f2d121b6abd99518b8515788b464b8a52f9ff8077a4699d04136f0159a58d1dbf1ce607e	2026-08-11 12:02:02.947	2026-08-11 12:02:02.947
6cVZlEIAFpMBCsCD9CmVhPobTwTu8kVO	NYPpW8sWNDp4HrtcTacBhCKsRhAATjnu	credential	NYPpW8sWNDp4HrtcTacBhCKsRhAATjnu	\N	\N	\N	\N	\N	\N	333c10582978a6922f97aba223bbd095:4f6149adf5b1bcccd9171a6e6e1611680934c2009d2454847ece110ea51716682fd7dfd0fa6a75f4abb393e426d19d104f82469a092f025a9e7055f71c25bf5c	2026-08-11 12:02:06.216	2026-08-11 12:02:06.216
5LE0bTMNXwBlzHZPeR3pmYHje6tTwO7Q	HOuAIuQmwUNgZhFkKGsaQKajS9dWERZz	credential	HOuAIuQmwUNgZhFkKGsaQKajS9dWERZz	\N	\N	\N	\N	\N	\N	54fb39777b6d2466607e2d481c99b0c4:0fe1dbbaf1fa87288d763ae51ec3fb7ecff11ddd3740976483f0f56e7188a37a307b3984f91b84ab66346f7e73f83d393271df1cb1a7dba7e9818704a7417c62	2026-08-11 12:02:17.472	2026-08-11 12:02:17.472
I0SWFlWsutB4ot21wQRyyZNjH4bYwh77	ShP0rg6aeTFUUe6uCIOnemcLtaGRbzu1	credential	ShP0rg6aeTFUUe6uCIOnemcLtaGRbzu1	\N	\N	\N	\N	\N	\N	f8a6c19b02aa65a0c52dd2bc7159569d:962f055857c6cb30589fec30d4a74a21a4781633d01642703738ba15cc2a5a7b5fdce2dba49ef646cbcb524525b7117e081c0e9f9b9fa0408be36e49865d7948	2026-08-11 12:02:25.31	2026-08-11 12:02:25.31
uwq271HIq5ZPeN5KGTnQJAYHPOaDDQlK	zeeGZDbPGPHCscCCy3UrucGSHNAx4Q4a	credential	zeeGZDbPGPHCscCCy3UrucGSHNAx4Q4a	\N	\N	\N	\N	\N	\N	fbc10e9c9304d3d8753ff10896986920:e07116b77301673ad77859435083a53adaab29016c56f03a89bee6a8507af8e75b78dd47640e0381e211d9bdc6de7b6fcb96279dca19a0960f96774998d4d89a	2026-08-11 12:02:09.85	2026-08-11 12:02:09.85
k2YYxtHsiD0MiyMOpSy7u9uVTM4KcX3V	9XigSaxGVO8lu6KlzVrpUJewgJhOIUSq	credential	9XigSaxGVO8lu6KlzVrpUJewgJhOIUSq	\N	\N	\N	\N	\N	\N	b948f4bd72a95c3ba30960f80ebeab9f:55b39c6841c81b077d92962d1861c751f4cbbe71d8aef99216b66ece3f0679b0a2d1ab5164fab4e6b30185de4d5aaaf141587f660577ced3baca917c16218258	2026-08-11 12:02:13.423	2026-08-11 12:02:13.423
zZq63E0zuiAw3B6qm7JOLuGuPrUdd4GX	e5hFadZiKpbx76qYrAzJf41CAcOHj7E5	credential	e5hFadZiKpbx76qYrAzJf41CAcOHj7E5	\N	\N	\N	\N	\N	\N	bff4c34c6c6d213808212e4fec246cbd:5c0a4f142de212f75d72e8856de59e5976431acb8d39c37fe394e66247efb9f724a5052d7abb79d904d6ee70851334d6ceb009007104b8da5a7eb5b19df923bb	2026-08-11 12:02:21.86	2026-08-11 12:02:21.86
KeviqLzK3Uurr9Lyv339UM3JxhtxsaNq	xpzUGeQbZ5M5NBbsDUzjnTiuO6eOhocv	credential	xpzUGeQbZ5M5NBbsDUzjnTiuO6eOhocv	\N	\N	\N	\N	\N	\N	a2f909c4e5829a384f52c6c2b0478cfa:de121ca4798529e5976e239b9b80bb2e49cca7cdefe5b5abda47ab0b0833403e37bbf23b0c10ef128ef6d7c84c7bb2e5b2703b6418f23ac0e1f24039de044489	2026-08-11 12:02:31.96	2026-08-11 12:02:31.96
Cha9rdFEhtPLodBBc25uZJaMun5Kji12	lp0oqGEiuiZxMqEwJ7GBMnj7jT5z2ZfP	credential	lp0oqGEiuiZxMqEwJ7GBMnj7jT5z2ZfP	\N	\N	\N	\N	\N	\N	2e9c7383623f19f07c339c8c013c3146:1474c12b0e8f476a4d491c4c9a496d8399fe9a8138eb6eb478d032dfa2ad21f93a70031403df786b4382c69fc5c6577eef4ac0b0a78d9af9212ecf783ed6a739	2026-08-14 05:25:55.735	2026-08-14 05:25:55.735
KN3NUtEXFrgSpfcgpW11q3sjxMIiPspM	oyIxLPFQorKXgCKygLTxvglSdgfHASWk	credential	oyIxLPFQorKXgCKygLTxvglSdgfHASWk	\N	\N	\N	\N	\N	\N	834be841b87ff578ebdb89726c181bd6:ba6bb4350c3c7222b6c7a89eaebcb936eff614035a507893d15e8294fd9607c15e6b439b3e818af42c8eed897b92c6a321692f3166a1c66fe6ab2c7647457d8d	2026-08-14 05:26:02.963	2026-08-14 05:26:02.963
7MRzszlk4AsyYYEFeAUheUBbCmG4EAif	zKdy6h44Fv2c8qJikShNeLTxUbYPfD9f	credential	zKdy6h44Fv2c8qJikShNeLTxUbYPfD9f	\N	\N	\N	\N	\N	\N	08c1e518abedc911626b5ab5552b6bfe:7de4c7af768c87528f506296fc579c94a25ac97ec3c7351ba7e6c014c56fc9982be4d3970e0905c8615ddd13585d6eb5fe97f421a362c1de2edaee216c08155a	2026-08-14 05:26:06.365	2026-08-14 05:26:06.365
knm4xGIEJZR5NuQmUhZRU2oMsIMf4RNV	fVm6VADGB7mUkbchII4DRsFBdGvQb3KV	credential	fVm6VADGB7mUkbchII4DRsFBdGvQb3KV	\N	\N	\N	\N	\N	\N	81b8504517820d728771cc8f74138628:2b1b84e82742f148f722a40c78e5fa80d57d4988ca5a7f389e5f100c7ece1b5eaf9bd5eff1746e4f6616ed5090c765eeb3721548dfcb5112d142b64688992407	2026-08-14 05:26:10.769	2026-08-14 05:26:10.769
xwvtxOkJ1Wrod0MPynwCStoyS0MQGWiY	vp1HiaN5MzhX9jIU4s5v5l6POJrtel4g	credential	vp1HiaN5MzhX9jIU4s5v5l6POJrtel4g	\N	\N	\N	\N	\N	\N	36b476ba5c7f09ba4bb599f4816f3bc2:b87efaef5411b5adc83aca45cbb7c17495bb85aa55301833eca7bb0258b7cf74cbaa5d319dd2a2fc11347e523bae53bc78bd4a694f30d15dc5b7c38d178e8273	2026-08-17 12:34:42.996	2026-08-17 12:34:42.996
BNxPXbJCPZTwTR581IJwXSOlqcLf7LgW	ffSm4sodxdiWv3WsjXA7Q4u91JKjtNCI	credential	ffSm4sodxdiWv3WsjXA7Q4u91JKjtNCI	\N	\N	\N	\N	\N	\N	4bfe962de30c4a3c58b980362affc52b:5ec3ddaef3d47419f8a06ef3e21aeb668f2d3e01d70d0bed23f4896a885e614bda7edcdeefe65469d6d3f4cf9639692dc6c768ee7901fbf7a4afd30c8a1d5593	2026-08-17 12:34:48.003	2026-08-17 12:34:48.003
E3ECa5vJZ0OfbCGX6u6pJpjD5Vo93VVZ	ODOJ6KT7epI8QN1l8sRKNPAI9fsZY3Jo	credential	ODOJ6KT7epI8QN1l8sRKNPAI9fsZY3Jo	\N	\N	\N	\N	\N	\N	a73d5eb2eab3a8f8d5557737bf694d98:48b362770074ef4156fd952cce34ab6aee8153d0fe047613416dde205a2bdf438f72a1ec766175372ea318c41b1e72f6b45c64820e3da94cc33ffb1963f34f3c	2026-08-17 12:34:51.387	2026-08-17 12:34:51.387
1wRLxhAF8RkygcANhvV8FgzCW04DnEAZ	K489SeItx8Jj8HqNLfuZcFXEjGkXhtrl	credential	K489SeItx8Jj8HqNLfuZcFXEjGkXhtrl	\N	\N	\N	\N	\N	\N	784938a8b4ab0f692bdc8cff6a6428a1:23d19a6c325770ca06fe7658a4bbbf424b9fdcf5345b18e5a312907c3ce5fc6bce9de5685e79f4dcfb81fbb7a38fb1acce051cdda0cf2544772c2b90910fc495	2026-08-17 12:34:54.924	2026-08-17 12:34:54.924
Pi5U6fG1bqQ0tQnIaRE7LTDK2XVSATop	BoY661ZwRMrKnngom15QANq7zSvWGY3P	credential	BoY661ZwRMrKnngom15QANq7zSvWGY3P	\N	\N	\N	\N	\N	\N	ef78fddc2c2935f11bae3b33f9b72b3f:b20870f0a07df9b396e54431147af8d4921fb442c87bfeff090a20593a40f3415b518442ff98811224fb4a0e328ef1202ae25fc5839c3488464917641c4a5e28	2026-08-17 12:34:58.507	2026-08-17 12:34:58.507
WzJCvORmnKwtwQS3qGKOb54kJNrML2I2	FiZDJCLMGlgXz2pfZE2TZsFwhamfNNxm	credential	FiZDJCLMGlgXz2pfZE2TZsFwhamfNNxm	\N	\N	\N	\N	\N	\N	42d47b65a43a3cc40a112a841064c039:50097eab6ed54a73ef09c64ac221bf73338b94c46ccadedc41d5b1a494501626fef44fead7fb8ceb1ab3ce51661a198ae706db27474e9dc6956ffedb79cb531c	2026-08-17 12:35:02.283	2026-08-17 12:35:02.283
QUTVVqkkoz6UXvfCrnXSBbj38K7msRlP	BefrFmmjxOZmaivXvOIikvZhh9WIvlP5	credential	BefrFmmjxOZmaivXvOIikvZhh9WIvlP5	\N	\N	\N	\N	\N	\N	61c08bc22dd0b1acbebc7e520a9a2e16:cf85d0c9c495363051dab055f658fd03a1fa033062aedfea8109f3d8977ae18307f3b73e27d8efd58f86d0a495be34d8f0be92e3268c98a6370f2444135efa36	2026-08-17 12:35:06.207	2026-08-17 12:35:06.207
UwDjGg376uri6CTyku6qQO58NrAlY72P	3nw95baXeASPfwxObXaAWn0ETpRfO6zL	credential	3nw95baXeASPfwxObXaAWn0ETpRfO6zL	\N	\N	\N	\N	\N	\N	f8d50238e136e62f986ed43eef871ba5:ee7ba2e9b5c848a2a6ffe87cd1bd149460972334c5e1d930484cc0aa61ac59f2ad240c317bad894ca22d8f075a7bf76f43fcd7a4392dc510ddeba26a81e96e6c	2026-08-17 12:35:09.445	2026-08-17 12:35:09.446
9idStOD7GMYkfl939VOrCfdOI1lnAIDD	zvI44L5rXCNfCzP87UUvPzoVxa9KOYzO	credential	zvI44L5rXCNfCzP87UUvPzoVxa9KOYzO	\N	\N	\N	\N	\N	\N	da97cee252ca7ae7a406d0b7f7355d91:558003cc6f6772cf93fea5ccc78e7840e6d7328ea1bb46ac481d4c84c715f17534bd048e45cae318dd5009048ea17c01e908e5f8fa44cd750995316335b5d611	2026-08-17 12:35:15.923	2026-08-17 12:35:15.923
1ZX28kPcb9Oyk7VwJQAnXxnr7u3W3DD8	WatvV9UDwjXJnjkzFoXYuel2FfYEXFqJ	credential	WatvV9UDwjXJnjkzFoXYuel2FfYEXFqJ	\N	\N	\N	\N	\N	\N	1c60b7fa9826e7fe2d364ece2b1c6a7d:ebb5f9c585a2f40e31773e3ade325e698cfa76873e547e53f4d90f6c66ccc087af7950ee441fe096249dd38f16215d639306ccefe3eaa93e50c21c735f3fcd36	2026-08-20 05:42:01.025	2026-08-20 05:42:01.025
mOdpaSP3XKIqBOzZeVdeFkxMH6YZLQYN	VL0aV4pVwbuqzNaDS9MTFnrmeKrOy9s7	credential	VL0aV4pVwbuqzNaDS9MTFnrmeKrOy9s7	\N	\N	\N	\N	\N	\N	c944a63bc03bf92538e6b67db7edf3c8:0cceb3a5c41bb0814a9eba81c113dda6b77648a9ab14b8f41a5200dd433dbfd2891f9c9ac41d1c3addf2806860454348be4a46987274bd8df7c219987f377525	2026-08-20 05:42:06.351	2026-08-20 05:42:06.351
z2Vuz2oNEM0gNpXTdT3Rm5XaBtOwrKRn	Do6FQfPUZcIGck5nRkeD3Zg6hODoWzEW	credential	Do6FQfPUZcIGck5nRkeD3Zg6hODoWzEW	\N	\N	\N	\N	\N	\N	46650b19dbdc530f19c2f7b430e0d214:ca173720bba8fd5cb55b41908638f9bdf7bb6beb3b0d4bea588f6b096421de476831eec2e47cb29379a78a76865e24f8f4f167a4cd88a05fae18bf9a1502321e	2026-08-20 05:42:09.6	2026-08-20 05:42:09.6
JMfOB6hCdw62S5Utn11wfWP8bW8fGiU2	mjRYL3FSEEoCWgqmYCgJyRFCIQ9whtWY	credential	mjRYL3FSEEoCWgqmYCgJyRFCIQ9whtWY	\N	\N	\N	\N	\N	\N	a91a95c7d408f9beecf3667b4680bb27:fb6fd369439b6c9c3787bea32685e268d0cf3f611304a8f0698075cd8f9b33a014445cfbb6a710be02c0ee0fe490cf66473e18f5a1b9e48bcdfc79978ad9882c	2026-08-20 05:42:13.754	2026-08-20 05:42:13.754
ukSGBPZ77RvWe08BXwGeUZpB6N4cwUEA	3iz36rvfzjk5sKmQlO7YQXhNUZwYGtg2	credential	3iz36rvfzjk5sKmQlO7YQXhNUZwYGtg2	\N	\N	\N	\N	\N	\N	fa6aa3ba6a2c3fd2d69857cfc1d9ef25:5a2a1d76e7dcbb89929d4a1aa1aff07e433fba4714b41345cdee0ef91fc1a3f8bd123769b573c86e1250dd5447d742f6a237e90f906052850c41ea853f6fb2d1	2026-08-20 05:42:17.518	2026-08-20 05:42:17.518
Vpjhwq8u6cCG1CSyKUS9fsox8vJp334O	6dRHVMDzI88xZoqERxLDev45iefATYsb	credential	6dRHVMDzI88xZoqERxLDev45iefATYsb	\N	\N	\N	\N	\N	\N	f514501f1ba5302a747088b39f95ad0d:29089e0af73d337ee5a21e7f5b3e845259c25d5a0b8f87535e2d3b45bf9336fb0735fc54ad37816f9f454f6adb3efc6e7494ff62d5a39c3e7ade9013b2ada2a2	2026-08-20 05:42:21.563	2026-08-20 05:42:21.563
f8X8BDaNtR66M9s7ofjK8wLLDpUcx6SS	o2C2BqYklhIDj6HTLNB9eH3YHjP0thlT	credential	o2C2BqYklhIDj6HTLNB9eH3YHjP0thlT	\N	\N	\N	\N	\N	\N	5b326cf2b74b1fa785b8d8e7d800ec25:ce88fa7ef23e8b0e16d7225b7295f4224d1b7bf5a5451ea9560b0d444889823243ccad3ce4c3cd066699af34fcf3aa9eeac771b840ab290398dd9cda4b8fb4de	2026-08-20 05:42:30.593	2026-08-20 05:42:30.593
mgtJCwMfkaNdajQ6vxWrCa41E2vXjkVD	XatEjzz94rK2o6CbEDC7RHXwFMGgslQK	credential	XatEjzz94rK2o6CbEDC7RHXwFMGgslQK	\N	\N	\N	\N	\N	\N	2f130fe2ce282aced1e0638a5605a939:faa1a6f0e54e88ffcf916ed0ecc83bce2d089433f2ad00488a706468b0e68dbd3c4d8e045a3de56da0b42773dc8669688c4f1f23da0418ed740fe6e715720a43	2026-08-20 05:42:38.617	2026-08-20 05:42:38.617
Jn0mfFCc42eLFURdv7x9FoJKlVYvJaml	h842HTjxS0abmxIx95jyjXuBFkyZVDmT	credential	h842HTjxS0abmxIx95jyjXuBFkyZVDmT	\N	\N	\N	\N	\N	\N	2e576166a710ec422f17ee6c5daca39d:00c2c512f0b940999f94f0f50a3cde71482e52fe395387e87922428a4b0cf31b704f563ef5dff58679073457f9ba5080474819e87de036f4dfd964d302533a33	2026-08-20 05:42:35.367	2026-08-20 05:42:35.367
Rdg9rckGU0LDriV3PDQKn2gU6mKZot2j	pDYdEP3ZNY4wrCkYd6BKWuWtEQ3Xc7Zo	credential	pDYdEP3ZNY4wrCkYd6BKWuWtEQ3Xc7Zo	\N	\N	\N	\N	\N	\N	e681c69779261a218dff78d4828fbbe3:ee3c2e26104e8ca827fd37cd9a613a29a592b7f5ad65bcf9c13e0daf6f5f683e18da3c0d519f1429b6e10921a3578949d7251dadcd900ab76b2c62a85da3f243	2026-08-20 05:42:41.707	2026-08-20 05:42:41.707
EUi11WulM200C1VMy9Y9NLTof2hTPmHE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	credential	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	\N	\N	\N	\N	\N	\N	c314c7f1e2c52daf8e3322471f857998:b099a9b37345e1bc6555cc97d0b4704665655c4ef1e4c0a00dc18faf31ce9e790429d11947c4822c3ff432238ea1964a952bc2d76dcda6b051047350a21066e2	2026-08-20 05:55:20.802	2026-08-20 05:56:21.559
rB3CrSJv13NKOKMg8nOHOUVKsKi0O1W2	ZNoWXYNoSG64Ofje4RtkzbJ76OCG5Ehn	credential	ZNoWXYNoSG64Ofje4RtkzbJ76OCG5Ehn	\N	\N	\N	\N	\N	\N	e01f321acdceba69639d112b09a5f379:47edb1257a50847536047865a98a22a2ed0cbaebaf7f5850b22928f049c21492821250e234c9d0d678b7198c03b53578c3eff12c051be5515c786bdc1cbf8abf	2026-08-20 05:42:27.39	2026-08-21 10:27:24.069
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointments (id, patient_id, doctor_id, department_id, scheduled_at, reason, status, token, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance (id, staff_id, date, check_in, check_out, status, notes, created_at, updated_at) FROM stdin;
1	83	2026-08-17	06:57	06:57	Present	Punched in via dashboard | Punched out via dashboard	2026-08-17 06:57:29.159953	2026-08-17 06:57:29.159953
2	32	2026-08-18	06:10	06:10	Present	Punched in via dashboard | Punched out via dashboard	2026-08-18 06:10:01.090851	2026-08-18 06:10:01.090851
3	5	2026-08-20	04:31	04:31	Present	Punched in via dashboard | Punched out via dashboard	2026-08-20 04:31:58.109761	2026-08-20 04:31:58.109761
4	2	2026-08-20	04:34	04:34	Present	Punched in via dashboard | Punched out via dashboard	2026-08-20 04:34:58.248022	2026-08-20 04:34:58.248022
\.


--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bank_accounts (id, account_name, bank_name, account_number, ifsc_code, branch_name, account_type, legal_entity, opening_balance, active, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: banks; Type: TABLE DATA; Schema: public; Owner: -
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
-- Data for Name: biometric_mappings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.biometric_mappings (id, staff_id, biometric_code, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: consultant_rates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.consultant_rates (id, doctor_id, base_rate, doctor_share_percent, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: daily_additional_income; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_additional_income (id, report_id, label, amount) FROM stdin;
\.


--
-- Data for Name: daily_closing_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_closing_reports (id, report_date, created_by, opening_balance, bank_deposit, fund_handover_sir, fund_handover_madam, total_income, total_expenditure, closing_balance, cash_receipt_sir, cash_receipt_mam, cash_receipt_acon, cash_receipts_total, cash_receipts, bank_receipts_total, bank_receipt_sir, bank_receipt_sir_bank, bank_deposits, status, created_at, updated_at, cash_denominations, reconciliation_tolerance, soiled_notes) FROM stdin;
7	2026-07-21	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	18627.00	0.00	0.00	0.00	140390.00	126430.00	17687.00	0.00	8000.00	32000.00	125490.00	85490.00	54900.00	0.00	\N	[]	submitted	2026-07-21 08:32:46.282201	2026-07-21 12:52:21.132	{"10": 10, "20": 11, "50": 9, "100": 40, "200": 20, "500": 18}	0.00	990
9	2026-07-23	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	6255.00	250000.00	0.00	0.00	260253.00	165785.00	2147.00	250000.00	0.00	25000.00	411677.00	136677.00	123576.00	0.00	\N	[{"bankName":"BOI-100","amount":200000},{"bankName":"Sir(HDFC-15820)","amount":50000}]	submitted	2026-07-23 09:36:54.268438	2026-07-25 06:27:05.557	{"10": 9, "20": 2, "50": 2, "100": 2, "200": 4, "500": 2}	100.00	990
8	2026-07-22	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	17687.00	0.00	0.00	0.00	252830.00	195480.00	6255.00	0.00	0.00	32000.00	184048.00	152048.00	99682.00	0.00	\N	[]	submitted	2026-07-22 06:01:32.947419	2026-07-22 12:58:44.517	{"10": 30, "20": 17, "100": 3, "200": 2, "500": 10}	0.00	990
5	2026-07-19	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	23747.00	0.00	0.00	0.00	276507.00	155920.00	31459.00	0.00	0.00	0.00	163632.00	163632.00	112875.00	0.00	\N	[]	submitted	2026-07-20 12:04:27.855119	2026-07-20 12:30:37.258	{"20": 20, "50": 1, "200": 5, "500": 60}	9.00	990
3	2026-07-18	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	1122.00	6000.00	0.00	0.00	520692.00	257840.00	23747.00	46000.00	0.00	0.00	286465.00	240465.00	280227.00	0.00	\N	[{"bankName":"Humakind (ICICI)","amount":6000}]	submitted	2026-07-18 10:37:39.009433	2026-07-20 11:21:35.867	{}	0.00	\N
2	2026-07-17	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	10003.00	0.00	0.00	50000.00	514445.00	200100.00	1122.00	0.00	0.00	68000.00	241219.00	173219.00	341226.00	0.00	\N	[]	submitted	2026-07-17 10:02:45.968485	2026-07-18 10:32:10.22	\N	0.00	\N
1	2026-07-16	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	7242.00	0.00	0.00	30000.00	371446.00	238290.00	10003.00	0.00	21500.00	19000.00	271051.00	230551.00	140895.00	0.00	\N	[]	submitted	2026-07-16 07:00:34.92745	2026-07-17 09:24:12.448	\N	0.00	\N
6	2026-07-20	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	31459.00	0.00	0.00	0.00	189931.00	139510.00	18627.00	0.00	0.00	0.00	126678.00	126678.00	63253.00	0.00	\N	[]	submitted	2026-07-20 12:32:47.602027	2026-07-20 12:55:41.472	{"10": 7, "20": 5, "50": 7, "100": 3, "200": 4, "500": 34}	10.00	910
15	2026-07-27	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	12534.00	100000.00	0.00	22500.00	479713.00	234030.00	33618.00	100000.00	0.00	0.00	377614.00	277614.00	202099.00	0.00	\N	[{"bankName":"HDFC(Sir)-15820","amount":50000},{"bankName":"Acme (BOI 100)\\t\\t\\t","amount":50000}]	submitted	2026-07-31 07:36:57.079369	2026-08-02 06:33:49.078	{"10": 7, "20": 2, "50": 2, "200": 7, "500": 62}	18.00	990
11	2026-07-25	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	15215.00	0.00	0.00	0.00	355948.00	203100.00	7294.00	0.00	0.00	0.00	195179.00	195179.00	160769.00	0.00	\N	[]	submitted	2026-07-25 09:40:16.362409	2026-07-31 06:48:42.428	{"10": 14, "20": 31, "50": 10, "100": 3, "200": 1, "500": 9}	44.00	990
13	2026-07-29	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	15540.00	140000.00	0.00	95000.00	342238.00	173595.00	15978.00	140000.00	0.00	18000.00	409033.00	251033.00	91205.00	0.00	\N	[{"bankName":"AXIS (Sir)","amount":50000},{"bankName":"Acme (BOI 100)\\t\\t\\t","amount":90000}]	submitted	2026-07-30 10:00:39.179109	2026-08-02 11:14:02.602	{"10": 15, "20": 32, "50": 3, "100": 19, "200": 21, "500": 16}	50.00	988
19	2026-08-03	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	13559.00	200000.00	0.00	0.00	341321.00	92060.00	6089.00	200000.00	0.00	0.00	284590.00	84590.00	256731.00	0.00	\N	[{"bankName":"ACME ICICI","amount":100000},{"bankName":"SIR AXIS","amount":85000},{"bankName":"MADAM INDUSIND","amount":15000}]	submitted	2026-08-03 06:32:10.465371	2026-08-03 11:08:14.195	{"10": 4, "20": 21, "50": 7, "100": 7, "200": 3, "500": 6}	100.00	990
10	2026-07-24	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	2147.00	0.00	0.00	100000.00	761007.00	235300.00	15215.00	0.00	0.00	0.00	348368.00	348368.00	412639.00	0.00	\N	[]	submitted	2026-07-25 06:31:35.468416	2026-07-31 05:15:21.169	{"5": 38, "10": 8, "20": 18, "50": 5, "100": 6, "200": 4, "500": 26}	65.00	\N
21	2026-08-04	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	6089.00	200000.00	0.00	0.00	354104.00	238830.00	4269.00	200000.00	0.00	102000.00	437010.00	135010.00	219094.00	0.00	\N	[{"bankName":"ACME ICICI Bank","amount":150000},{"bankName":"Sir ICICI Bank","amount":50000}]	submitted	2026-08-04 05:45:12.959418	2026-08-04 11:35:24.121	{"10": 3, "20": 33, "50": 4, "100": 11, "200": 4, "500": 1}	11.00	990
12	2026-07-30	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	15978.00	0.00	200000.00	0.00	677720.00	157120.00	14796.00	0.00	5000.00	0.00	355938.00	350938.00	326782.00	0.00	\N	[]	submitted	2026-07-30 09:14:46.062328	2026-08-04 05:44:23.913	{"10": 31, "20": 20, "50": 6, "100": 19, "200": 12, "500": 17}	4.00	990
14	2026-07-26	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	7294.00	0.00	0.00	40000.00	428597.00	127860.00	12534.00	0.00	0.00	0.00	173100.00	173100.00	255498.00	0.00	\N	[]	submitted	2026-07-31 06:49:31.119653	2026-07-31 07:35:26.787	{"10": 11, "20": 34, "50": 10, "100": 12, "500": 18}	54.00	990
17	2026-07-28	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	33618.00	0.00	0.00	80000.00	603511.00	183755.00	15541.00	0.00	0.00	20000.00	245678.00	225678.00	377833.00	0.00	\N	[]	submitted	2026-08-02 06:34:14.84169	2026-08-02 10:23:58.473	{"10": 14, "20": 27, "50": 3, "100": 7, "200": 20, "500": 18}	21.00	990
22	2026-08-05	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	4269.00	0.00	150000.00	90000.00	709109.00	193440.00	21194.00	0.00	0.00	0.00	450365.00	450365.00	258744.00	0.00	\N	[]	submitted	2026-08-05 06:36:03.080139	2026-08-05 11:42:09.656	{"10": 9, "20": 11, "50": 6, "100": 12, "200": 37, "500": 22}	11.00	990
20	2026-08-02	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	5356.00	0.00	0.00	0.00	400585.00	181820.00	13526.00	58000.00	0.00	0.00	189990.00	131990.00	268595.00	0.00	\N	[]	submitted	2026-08-03 08:37:38.52048	2026-08-03 11:35:58.884	{"20": 1, "50": 1, "200": 30, "500": 13}	34.00	990
18	2026-08-01	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	14166.00	100000.00	0.00	0.00	239495.00	80940.00	5356.00	100000.00	0.00	4000.00	172130.00	68130.00	171365.00	0.00	\N	[{"bankName":"ICICI Sir","amount":100000}]	submitted	2026-08-02 06:58:58.510748	2026-08-05 09:50:15.122	{"10": 20, "20": 35, "50": 2, "100": 10, "200": 2, "500": 4}	34.00	990
23	2026-08-06	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	21194.00	66000.00	0.00	40000.00	230893.00	147930.00	9294.00	66000.00	0.00	37000.00	242030.00	139030.00	91863.00	0.00	\N	[{"bankName":"Sir ICICI Bank","amount":66000}]	submitted	2026-08-06 06:12:52.46807	2026-08-06 11:30:34.003	{"10": 16, "20": 30, "50": 3, "100": 22, "200": 16, "500": 4}	6.00	990
24	2026-08-07	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	9294.00	0.00	250000.00	0.00	768796.00	228100.00	15654.00	0.00	0.00	0.00	484460.00	484460.00	284336.00	0.00	\N	[]	submitted	2026-08-07 05:02:13.577721	2026-08-07 11:26:04.228	{"10": 14, "20": 24, "50": 3, "100": 10, "200": 7, "500": 23}	6.00	990
25	2026-08-08	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	15654.00	0.00	0.00	0.00	388968.00	198840.00	31749.00	0.00	0.00	0.00	214935.00	214935.00	174033.00	0.00	\N	[]	submitted	2026-08-08 04:45:39.858197	2026-08-08 12:21:34.297	{"10": 2, "50": 1, "100": 18, "200": 32, "500": 45}	11.00	990
26	2026-08-09	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	31749.00	0.00	0.00	0.00	586204.00	113730.00	223163.00	0.00	0.00	0.00	305144.00	305144.00	281060.00	0.00	\N	[]	submitted	2026-08-09 04:23:56.194787	2026-08-09 11:36:06.744	{"10": 23, "20": 15, "50": 3, "100": 13, "200": 31, "500": 428}	11.00	990
34	2026-08-17	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	4637.00	145000.00	0.00	0.00	114170.00	88260.00	7757.00	0.00	195000.00	0.00	236380.00	41380.00	72790.00	0.00	\N	[{"bankName":"Humankind ICICI Bank Cash Deposit","amount":145000}]	submitted	2026-08-17 05:06:35.388222	2026-08-17 12:27:07.159	{"10": 24, "20": 6, "50": 8, "100": 9, "200": 8, "500": 7}	7.00	990
32	2026-08-15	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	17595.00	0.00	0.00	50000.00	135393.00	56200.00	2535.00	0.00	0.00	16000.00	91140.00	75140.00	60253.00	0.00	\N	[]	submitted	2026-08-15 08:13:42.738591	2026-08-15 12:13:58.748	{"10": 6, "20": 9, "50": 12, "200": 1, "500": 1}	5.00	990
30	2026-08-13	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	50215.00	0.00	0.00	45000.00	185310.00	103310.00	14375.00	0.00	0.00	0.00	112470.00	112470.00	72840.00	0.00	\N	[]	submitted	2026-08-13 06:43:21.869092	2026-08-13 11:51:59.157	{"10": 16, "20": 9, "50": 3, "100": 10, "200": 27, "500": 13}	5.00	990
28	2026-08-11	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	27725.00	580000.00	0.00	50000.00	400952.00	153050.00	16365.00	550000.00	0.00	30000.00	771690.00	191690.00	209262.00	0.00	\N	[{"bankName":"Humankind ICICI Bank","amount":60000},{"bankName":"ACME ICICI Bank","amount":210000},{"bankName":"ACON ICICI Bank","amount":250000},{"bankName":"Sir AXIS Bank","amount":60000}]	submitted	2026-08-11 05:03:27.046125	2026-08-11 11:59:59.814	{"10": 8, "20": 10, "50": 4, "100": 10, "200": 2, "500": 27}	5.00	990
31	2026-08-14	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	14375.00	30000.00	0.00	0.00	392926.00	170550.00	17595.00	0.00	30000.00	0.00	203770.00	173770.00	219156.00	0.00	\N	[{"bankName":"Ma'am(HDFC Bank)Cash Deposit","amount":30000}]	submitted	2026-08-14 05:38:00.028583	2026-08-14 11:58:40.612	{"10": 8, "20": 6, "50": 12, "100": 9, "200": 22, "500": 21}	5.00	990
27	2026-08-10	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	223163.00	1210000.00	0.00	250000.00	482589.00	247008.00	27725.00	1300000.00	8546.00	0.00	1511570.00	203024.00	279565.00	0.00	\N	[{"bankName":"ACME ICICI Bank Cash Deposit","amount":500000},{"bankName":"Humankind ICICI Bank Cash Deposit","amount":500000},{"bankName":"Sir ICICI Bank Cash Deposit","amount":120000},{"bankName":"Ma'am ICICI Bank Cash Deposit","amount":40000},{"bankName":"Ma'am HDFC Bank Cash Deposit","amount":50000},{"bankName":"","amount":0}]	submitted	2026-08-10 06:35:57.990756	2026-08-10 12:20:24.061	{"10": 15, "20": 17, "50": 1, "100": 20, "200": 36, "500": 34}	5.00	990
29	2026-08-12	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	16365.00	0.00	0.00	0.00	378565.00	168970.00	50215.00	0.00	0.00	26300.00	202820.00	176520.00	202045.00	0.00	\N	[]	submitted	2026-08-12 09:57:21.768506	2026-08-12 11:56:43.973	{"10": 3, "100": 8, "200": 27, "500": 86}	5.00	990
37	2026-08-20	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	4097.00	50000.00	0.00	0.00	336792.00	634390.00	2357.00	500000.00	0.00	52000.00	682650.00	130650.00	206142.00	0.00	\N	[{"bankName":"Sir AXIS Bank cash deposit","amount":50000}]	submitted	2026-08-20 04:39:19.363243	2026-08-20 11:44:21.039	{"10": 22, "20": 20, "50": 5, "100": 3, "200": 1}	3.00	990
40	2026-08-23	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	6265.00	0.00	0.00	0.00	55060.00	600.00	11305.00	0.00	0.00	0.00	5640.00	5640.00	820.00	0.00	\N	[]	draft	2026-08-23 05:08:18.53753	2026-08-23 09:36:00.466	{"10": 4, "20": 2, "200": 1, "500": 10}	5.00	990
38	2026-08-21	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	2357.00	0.00	0.00	0.00	352893.00	206370.00	4207.00	0.00	0.00	0.00	208220.00	208220.00	144673.00	0.00	\N	[]	submitted	2026-08-21 04:38:32.961407	2026-08-21 12:16:37.422	{"10": 4, "20": 4, "50": 4, "100": 14, "500": 3}	3.00	990
33	2026-08-16	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	2535.00	0.00	0.00	95000.00	271915.00	20120.00	4637.00	0.00	0.00	0.00	117222.00	117222.00	154693.00	0.00	\N	[]	submitted	2026-08-16 05:09:06.546489	2026-08-16 11:29:51.238	{"10": 19, "20": 5, "50": 5, "100": 6, "500": 5}	7.00	990
35	2026-08-18	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	7757.00	0.00	0.00	0.00	296696.00	140750.00	17167.00	0.00	0.00	0.00	150160.00	150160.00	146536.00	0.00	\N	[]	submitted	2026-08-18 04:48:23.718593	2026-08-18 12:02:38.677	{"10": 34, "20": 14, "50": 9, "100": 19, "200": 16, "500": 20}	7.00	990
36	2026-08-19	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	17167.00	0.00	0.00	0.00	294980.00	119740.00	4097.00	0.00	0.00	0.00	106670.00	106670.00	188310.00	0.00	\N	[]	submitted	2026-08-19 04:51:40.144905	2026-08-19 11:49:01.27	{"10": 38, "20": 14, "50": 11, "100": 9, "200": 5}	3.00	990
39	2026-08-22	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	4207.00	0.00	0.00	0.00	500877.00	163870.00	6265.00	0.00	0.00	0.00	165928.00	165928.00	334949.00	0.00	\N	[]	submitted	2026-08-22 09:23:54.558986	2026-08-22 12:12:07.661	{"10": 14, "20": 12, "50": 4, "100": 20, "200": 1, "500": 5}	5.00	990
\.


--
-- Data for Name: daily_discounts_returns; Type: TABLE DATA; Schema: public; Owner: -
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
3090	27	1 Old Case @20%Agny Card	90.00
3091	27	1 Old Case @50% Health Card	220.00
3092	27	1 USG FWB@10%Privilege Card	120.00
107	2	1 OLD CASE @50% Health Card	225.00
108	2	1 USG FWB @10% Privilege Card	120.00
109	2	1 Dressing Charge @10% Privilege Card	30.00
110	2	1 TVS Obs Twins @ 10% Privilege Card	100.00
286	8	1Old Case @ Free	450.00
287	8	1 Old Case @20% Agny Card	90.00
2826	26	1 O/C @ 50% 	225.00
2827	26	1 FWB @ 50% 	600.00
2828	26	1 O/C @ 10% 	90.00
1587	13	2 USG FWB@10%@privilege Card 	240.00
2829	26	1 FWB @ 10% (Privilege)	120.00
3387	29	1 O/C @ Free	450.00
3388	29	1 Iron Infusion @ 10% (Privilege)	60.00
2354	18	2 USG @ 10% discounted for priviledge card	240.00
4030	37	1 Old case@50% Healthcard	250.00
4031	37	1 USG FWB@50% Healthcard	600.00
3608	32	1New Case @20% Agny Card	120.00
3609	32	1TVS Gynae @10%Agny Card	70.00
3610	32		0.00
3611	32		0.00
4251	39	1FWB @ 10% (Privilege Card)	120.00
4252	39	2 TVS Obs. @ 10% (Privilege Card)	140.00
1296	11	2 FWB @ 10% (Privilege Card)	240.00
1297	11	Dressing Charge @ 10% (Privilege Card)	30.00
4253	39	1 Dressing Charge @ 10% (Privilege Card)	30.00
1364	14	1 Old Case @ 20% (Agny crd)	90.00
1365	14	1 Usg @ 10% (Priviledge card)	120.00
2119	20	1 usg @ 10% (PRIVILEDGE CARD)	120.00
2120	20	DRESSING CHARGE 10% (PRIVILEDGE CARD)	30.00
2646	24	1 Old Case@20% Agny Card	90.00
2647	24	1 USG FWB@10%Privilege Card	120.00
2648	24		0.00
2320	21	1 EMERGENCY O/C  @20% AGNY	120.00
2321	21	1 O/C @20% (AGNY)	90.00
2133	12	old case 50% (health card)	225.00
1196	10	1 Iron Infusion charge @10% Privilege Card (Night)	60.00
1197	10	1 TVS Obs @10% Privilege Card(Night)	70.00
1198	10	1 Old Case @50% Health Card	225.00
1199	10	2 USG FWB @10%Privilege Card	240.00
2134	12	TVS 50% (Health crd)	350.00
2135	12	USG 10% ( Priviledge card)	120.00
2136	12	combined sc nipt 10%(priveledge card)	350.00
2137	12	NT 10 % (priviledge card)	120.00
2138	12	Iron Infision @ 10% (Priviledge card)	60.00
1568	17	1 TVS Gynae @10% Privilege Card	70.00
1569	17	1 TVS Obs @10% Privilege Card	70.00
1570	17	1 Iron Infusion Charges @10% Privilege Card	60.00
1571	17	1 D/E @10 Privilege Card	1100.00
2453	23	1 USG FWB@10% Privilege Card	120.00
3487	31	1 Dressing charge @10% Privilege Card	30.00
3488	31	1 Iron Infusion Charge @10% Privilege Card	60.00
1394	15	1 New Case@20% Agny CARD	110.00
2081	19	1 OLD CASE FREE	450.00
2082	19	1 OLD CASE @ 20% (AGNY CARD)	90.00
2083	19	1 NT @ 10@ (aGNY CARD)	120.00
2084	19		0.00
2085	19		0.00
4124	38	1 Old Case @50% Healthcard	250.00
4125	38	1 USG FWB@10% Priviledge Card	120.00
2086	19		0.00
2087	19		0.00
2088	19		0.00
3917	36	1 Old Case@20% Agny Card	100.00
3281	28	1 Old Case @50% Health Card	225.00
2404	22	2 O/C @20% AGNY	180.00
2405	22	1 FWB @ 10% AGNY	120.00
3282	28	1 TVS Obs@ 10%Privilege Card	70.00
3283	28	1 USG FWB @10% Privilege Card	120.00
3284	28	1 Iron infusion charge@10%Privilege Card	60.00
3851	35	1 New Case @free	600.00
3852	35	1 Old Case @50% Health Card	250.00
3853	35	1 USG FWB@10% Privilege Card	120.00
3854	35	2 Iron Infusion Charge@10%1.Privilege card & 1 Agny Card	120.00
\.


--
-- Data for Name: daily_expenditures; Type: TABLE DATA; Schema: public; Owner: -
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
6327	17	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	12000.00	\N
6328	17	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
6329	17	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
6330	17	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
6331	17	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
6332	17	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
6333	17	CANTEEN_EXPENSES	Charcoal for Canteen 	900.00	\N
6334	17	STORE_MARKETING	MEDICINE & CONSUMABLES ITEMS	10000.00	\N
6335	17	HOME	Documentation Patta Charges for Club	1000.00	\N
6336	17	DIESEL	ACON	1000.00	Diesel for Venture\n
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
6337	17	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DDS	3900.00	Anaethesia charges for Dr.DDS(LSCS)\n
6338	17	MEDICAL_CONSULTANT_CHARGES	USG WHOLE ABDOMEN CHARGES FOR DR.SANJIT	1680.00	\N
15180	27	IVF_EXPENSES	Refreshment	210.00	\N
15181	27	ACON	ACON CONSTRUCTION	200.00	Labour Refreshment hostel
15182	27	INVESTMENT	Rajen Marup(for the month of July'26 & Aug'26)	40000.00	\N
15183	27	BAMON_KAMPU_CONSTRUCTION	Ajit for Labour fee	50000.00	\N
15184	27	MISC	Patient Refund	1650.00	\N
15185	27	ACON	ACON CONSTRUCTION	3270.00	Waterproof Tape,Carpet
15186	27	RECHARGE	TV Recharge for Front TV	1000.00	\N
11396	23	ACON	Carpet for ACON College(4th Floor)	7500.00	\N
6339	17	ACON	ACON CONSTRUCTION	230.00	Labour Refreshment for Hostel\n
6340	17	REFRESHMENT	OT	335.00	\N
6341	17	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	2010.00	Canteen Marketing for Vegetable Items(Bidyachandra)\n
6342	17	WATER	WATER BOTTLE	2000.00	\N
6343	17	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DMD	3700.00	LSCS
6344	17	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DDS	4800.00	TLH+BSO
6345	17	SOLID_WASTE	SOLID WASTE	7000.00	\N
6346	17	URUP	Goat pen for Urup	18000.00	\N
11397	23	CANTEEN_EXPENSES	CANTEEN MARKETING-(DRY ITEMS) 	15000.00	Somo
11398	23	DAILY_COLLECTION	KEISHAMTHONG ( GOLDEN ) RS15,000*1	15000.00	\N
11399	23	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
11400	23	DAILY_COLLECTION	SANATHOI (20000*2)	20000.00	\N
11401	23	CANTEEN_EXPENSES	CANTEEN DISPOSABLE ITEMS	2000.00	\N
11402	23	REFRESHMENT	OT	60.00	\N
11403	23	ACON	ACON CONSTRUCTION	230.00	Labour Refreshment
8715	12	WATER	WATER TANKER	1000.00	home
8716	12	WATER	WATER TANKER	1000.00	acme
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
8717	12	MEDICAL_CONSULTANT_CHARGES	USG WHOLE ABDOMEN CHARGES FOR DR.SANJIT	1680.00	\N
8718	12	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	1270.00	\N
8719	12	REPAIRING_&_SERVICING	VEHICLE	4000.00	venture (Ningthemjao\n\n\n\nventure (Ningthemjao)\n
8720	12	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	1820.00	\N
8721	12	PETROL	VAN	1000.00	\N
8722	12	COFFEE_SHOP_MARKETING	backery	150.00	\N
11404	23	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	3140.00	Bidyachandra
11405	23	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
11406	23	DAILY_COLLECTION	ASWF(20000*2)	20000.00	\N
11407	23	ACON	MU Inspection fee AY(2026-2027)	30000.00	\N
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
8723	12	REFRESHMENT	ACON CONSTRUCTION	140.00	\N
8724	12	REFRESHMENT	acme	100.00	\N
8725	12	PRINTING_AND_STATIONARY	acme	5000.00	\N
8726	12	REFRESHMENT	acme	260.00	\N
8727	12	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
8728	12	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
8729	12	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
8730	12	COFFEE_SHOP_MARKETING	bakery	500.00	\N
8731	12	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	12000.00	\N
8732	12	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
8733	12	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
8734	12	CANTEEN_EXPENSES		12000.00	\N
13685	26	WATER	WATER TANKER	1000.00	\N
13686	26	CANTEEN_EXPENSES	CANTEEN(FISH)	560.00	\N
13687	26	CANTEEN_EXPENSES	CANTEEN-(CHICKEN)	850.00	\N
13688	26	MEDICAL_CONSULTANT_CHARGES	USG WHOLE ABDOMEN CHARGES FOR DR.SANJIT	1680.00	\N
13689	26	ACON	WATER TANKER	1000.00	Girl's Hostel
13690	26	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
13691	26	DAILY_COLLECTION	SANATHOI (20000*2)	20000.00	\N
6554	13	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	12000.00	\N
6555	13	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
6556	13	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
6557	13	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
6558	13	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
6559	13	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
6560	13	WATER	ACME	1000.00	\N
6561	13	CANTEEN_EXPENSES	Commercial gas	6900.00	2
6562	13	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DDS	3700.00	LSCS
6563	13	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DDS	1500.00	Anaethesia Charges for Dr.DDS(OPU)\n
6564	13	NEWSPAPER_&_JOURNAL	Newspaper for the month of July'26(Home)	600.00	\N
6565	13	REFRESHMENT	OT	160.00	\N
6566	13	REFRESHMENT	IVF	345.00	\N
6567	13	ACON	ACON CONSTRUCTION	540.00	Labour Refreshment for ACON new Hostel\n
4588	10	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	12000.00	\N
4589	10	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
4590	10	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
4591	10	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
4592	10	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
4593	10	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
4594	10	ACON	ACON CONSTRUCTION	350.00	Labour Refreshment for ACON Hostel\n
4595	10	REFRESHMENT	OT	320.00	\N
4596	10	MEDICAL_CONSULTANT_CHARGES	1 Consultant visit for Dr.PK	700.00	\N
4597	10	MEDICAL_CONSULTANT_CHARGES	USG WHOLE ABDOMEN CHARGES FOR DR.SANJIT	840.00	\N
4598	10	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DDS	7400.00	2 Anaethesia Charges for Dr. DDS(3700*2)\n
4599	10	PRINTING_AND_STATIONARY	Photo Frame	6000.00	\N
4600	10	CANTEEN_EXPENSES	CANTEEN MARKETING-(DRY ITEMS)	2000.00	\N
4601	10	ACON	ACON CONSTRUCTION	35000.00	Ply Board for New hostel \n
4602	10	ACON	ACON CONSTRUCTION	29000.00	Stone Big 1 Load Boy's Hostel\n
4603	10	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING 	250.00	Coffee shop Marketing(Bakery Items)\n
4604	10	VENDOR	MARTMedicine Mart(Sporlac EVA)	4490.00	\N
12348	24	HUMANKIND_EXPENSES	Electric Recharge	1000.00	\N
12349	24	STORE_MARKETING	MEDICINE & CONSUMABLES ITEMS	6000.00	Inj.Duvadilan ,Dulcoflex Supp.
12350	24	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	4630.00	\N
12351	24	CANTEEN_EXPENSES	RICE FOR HOSTEL	2000.00	\N
12352	24	DAILY_COLLECTION	KEISHAMTHONG ( GOLDEN ) RS15,000*1	15000.00	\N
12353	24	ACME-LABOUR_EXPENSE	Mahindra	25000.00	\N
12354	24	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
12355	24	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
12356	24	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
12357	24	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
12358	24	HOME	Paneer for Home	180.00	\N
12359	24	ACON	ACON CONSTRUCTION	26700.00	BRICK
12360	24	ACON	ACON CONSTRUCTION	8500.00	STONE
5508	15	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	12000.00	\N
5509	15	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
5510	15	DAILY_COLLECTION	SANATHOI (15000*1)	30000.00	YESTERDAY(26-07-26)
5511	15	DAILY_COLLECTION	SANATHOI (20000*2)	60000.00	YESTERDAY(26-07-26)
5512	15	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
5513	15	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
5514	15	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DDS	12400.00	3 Anaethesia Charges for Dr.DDS(LSCS(pt. Babina) ,TLH+BSO(Renu) & LSCS(Ng. Maria)\n
5515	15	VENDOR	Alpha Store	7900.00	\N
5516	15	PRINTING_AND_STATIONARY	Flex for Doctor's App	550.00	\N
5517	15	RECHARGE	IVF Mobile Recharge	630.00	\N
5518	15	POSTAL_&_COURIER_CHARGES	Courier charges for CA Documents(Audit Filling)	220.00	\N
5519	15	PETROL	Perol for Van	1000.00	\N
5520	15	CANTEEN_EXPENSES	Rice(Super) for Canteen	1840.00	\N
5521	15	RECHARGE	Doctrz app SMS recharge 	220.00	\N
5522	15	VENDOR	Smart Care Agency(Gloves,Double J Stand,Spirit-400ml)Bill Date:21/07/2026	9000.00	\N
5523	15	REPAIRING_&_SERVICING	Printer servicing for Operation Dept.	500.00	\N
5524	15	ACON	ACON CONSTRUCTION	340.00	Labour Refreshment for New Hostel\n
5525	15	REFRESHMENT	OT	310.00	\N
5526	15	CANTEEN_EXPENSES	Canteen Marketing for Vegetables Items with fish	3380.00	\N
5527	15	VENDOR	SB Surgical	14000.00	\N
15187	27	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
15188	27	CONSUMABLES_ITEMS	Liquid Nitrogen 52 lit.	5200.00	\N
15189	27	HUMANKIND_EXPENSES	Courier Charges for Acrowell	8548.00	\N
23253	39	ACON	MU Inspection Bouquet	2000.00	\N
23254	39	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
23255	39	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
23256	39	MEDICAL_CONSULTANT_CHARGES	Ronibala Embryologist	2800.00	m/o June'26
23257	39	ACON	ACON CONSTRUCTION	320.00	Labour Refreshment
23258	39	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	35000.00	\N
23259	39	MISC	Milk	1000.00	\N
23260	39	ACON	WATER TANKER	1000.00	\N
23261	39	WATER	WATER TANKER	1000.00	\N
23262	39	PRINTING_AND_STATIONARY	Paid Seal for Front	100.00	\N
23263	39	REPAIRING_&_SERVICING	VEHICLE	800.00	Thar Wash & Brake oil
13692	26	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
13693	26	MISC	Immunization Refund	940.00	\N
13694	26	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
13695	26	RECHARGE	Deluxe 2 TV Recharge	500.00	\N
13696	26	MISC	Security Mess	500.00	\N
13697	26	ACON	ACON CONSTRUCTION	23000.00	\N
5528	15	REPAIRING_&_SERVICING	AC gas refilled for Deluxe-8	2000.00	\N
5529	15	WATER	WATER TANKER	1000.00	\N
5530	15	ACON	Electric recharge for Girls Hostel	1040.00	\N
5531	15	ACON	ACON CONSTRUCTION	15500.00	Tomthin electricals & Hardware for Girls Hostel Elecctrical Materials full payment\n
13698	26	ACON	ACON CONSTRUCTION	8500.00	Stone Chip
23264	39	PETROL	Van	1000.00	\N
23265	39	STORE_MARKETING	MEDICINE & CONSUMABLES ITEMS	5500.00	\N
12361	24	ACON	ACON CONSTRUCTION	10000.00	Sand
12362	24	BAMON_KAMPU_CONSTRUCTION	Sand	8500.00	\N
12363	24	ACON	Diesel for Bus	2000.00	\N
4605	10	VENDOR	Yam Yam Medicos	6340.00	\N
4606	10	VENDOR	Rivolta Medicos(Gtox-MV)	10000.00	\N
4607	10	POSTAL_&_COURIER_CHARGES	HUMANKIND Dalcon Courier Charge(Dalcon to Guwahati)	2790.00	\N
4608	10	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	2120.00	Canteen Marketing(Vegetable Items)Bidyachandra\n
4609	10	ACON	ACON CONSTRUCTION	500.00	Nail(5Kg) for New Hostel\n
12364	24	COFFEE_SHOP_MARKETING	Bakery items	400.00	\N
12365	24	RECHARGE	Deluxe-4 TV Recharge	500.00	\N
12366	24	ACME_ASSET_EXPENSES		0.00	\N
12367	24	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	Today
12368	24	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	2090.00	\N
12369	24	REFRESHMENT	OT	200.00	\N
12370	24	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	YESTERDAY(06-08-2026)
23266	39	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	5140.00	\N
23267	39	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	500.00	Bakery
23268	39	DAILY_COLLECTION	SANATHOI (20000*2)	55000.00	\N
6568	13	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	4000.00	Canteen marketing for Vegetables items\n
4967	11	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	12000.00	\N
4968	11	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
4969	11	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
4970	11	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
4971	11	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
4972	11	MEDICAL_CONSULTANT_CHARGES	ANAETHESIA CHARGE FOR DR.DDS	3700.00	Anaethesia Charges for Dr. DDS(LSCS-Twins )\n
4973	11	MISC	Lab Charges Dental	200.00	\N
4974	11	WATER	WATER TANKER	1000.00	Water Tanker for Girls Hostel\n
4975	11	MISC	Puinabati Interest(for the month of June'26)	36000.00	\N
4976	11	STORE_MARKETING	Store Marketing (Mom plus Syrup)	3380.00	\N
4977	11	MEDICAL_CONSULTANT_CHARGES	Consultant visit for Dr.PK	1330.00	\N
4978	11	MEDICAL_CONSULTANT_CHARGES	Anaethesia Charges for Tommorrow(3-LSCS )& Myst. Myomectomy	15600.00	\N
4979	11	MEDICAL_CONSULTANT_CHARGES	Anaethesia Charges for Tommorrow 1OPU	1500.00	\N
4980	11	ACON	ACON CONSTRUCTION	430.00	Labour Refreshment for ACON Hostel\n
4981	11	ACON	ACON CONSTRUCTION	35250.00	Wood for Boy's Hostel (Full Payment)\n
4982	11	ACON	ACON CONSTRUCTION	10000.00	Tomthin Electrical & Hardware(Electrical Material )for Girl's Hostel(2 partly payment)\n
6569	13	COFFEE_SHOP_MARKETING	Coffeeshop Marketing(Bakery ,Bread Items)	2200.00	\N
6570	13	MISC	DTO Imphal East Blacklisting Fee for Sir	700.00	\N
6571	13	CONSUMABLES_ITEMS	Patient Phanek	2800.00	\N
6572	13	REPAIRING_&_SERVICING	MEDICAL INSTRUMENTS	3450.00	Servicing Charge for OT Trolley Bed(Necatel)\n
6573	13	BAMON_KAMPU_CONSTRUCTION	Sand for Bamon Kampu	8500.00	\N
6574	13	MISC	Dismantling for Wangkhei(Partly Payment)	10000.00	\N
4983	11	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	4000.00	\N
4984	11	PROGRAM_&_FUNCTION	Coconut Water for The World IVF Day Celebration	100.00	\N
4985	11	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	3410.00	\N
13167	25	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
15190	27	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	2200.00	\N
15191	27	ACON	ACON CONSTRUCTION	60.00	Labour Refreshment for ACON Hostel
15192	27	VENDOR	USG WHOLE ABDOMEN CHARGES FOR DR.SANJIT	2520.00	\N
15193	27	INTEREST	Amita	9000.00	\N
5186	14	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
5187	14	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
5188	14	RECHARGE	Deluxe 6 TV Recharge	500.00	\N
5189	14	STORE_MARKETING	Fentanyl purchase	14800.00	\N
5190	14	VENDOR	Mahabir pharmacy	9420.00	\N
5191	14	ACON	ACON CONSTRUCTION	300.00	Labour Charge for Labour Refreshment\n
5192	14	VENDOR	Trio medical Store	11760.00	\N
5193	14	RECHARGE	Electric recharge for Wangkhei	1040.00	\N
5194	14	ACON	ACON CONSTRUCTION	28750.00	Bamboo for Acon Hostel Construction\n
5195	14	WATER	Water tanky (Acme)	2000.00	\N
5196	14	CONSUMABLES_ITEMS	Toffee, Band-Aid	460.00	\N
5197	14	COFFEE_SHOP_MARKETING	Coffee Shop (cake)	500.00	\N
5198	14	ACON	ACON CONSTRUCTION	150.00	labour refreshment\n
5199	14	COFFEE_SHOP_MARKETING	Coffee shop excess marketing	860.00	\N
5200	14	MEDICINES_ITEMS	Satyam lab (Re-agent)	15020.00	\N
5201	14	CANTEEN_EXPENSES	Chicken for Hostel	850.00	\N
5202	14	HOME	Bulb for Home	1200.00	\N
5203	14	REPAIRING_&_SERVICING	Terrano tyre gas refilling	50.00	\N
13151	25	REPAIRING_&_SERVICING	Extra service charge for generator(Diesel)	3000.00	\N
13152	25	CANTEEN_EXPENSES	CANTEEN(FISH)	560.00	\N
13153	25	BAMON_KAMPU_CONSTRUCTION	Cement	9450.00	\N
13154	25	DAILY_COLLECTION	KEISHAMTHONG ( GOLDEN ) RS15,000*1	15000.00	\N
13155	25	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
13156	25	PRINTING_AND_STATIONARY	Privilege card & Agny Card making charge	2100.00	\N
13157	25	CONSUMABLES_ITEMS	Easy Mop for  floor cleaner	7000.00	\N
13158	25	REFRESHMENT	OT	220.00	\N
13159	25	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	3280.00	\N
13160	25	ACON	PETROL	1000.00	\N
13161	25	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
13162	25	ACON	ACON CONSTRUCTION	80.00	Labour Refreshment for Hostel
13163	25	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	1000.00	\N
13164	25	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
10578	18	URUP	goat milk & vitamin	1300.00	\N
10579	18	REPAIRING_&_SERVICING	venture vehicle	3200.00	\N
10580	18	MISC	pharmacy paper bag	550.00	\N
10581	18	MARKETING	human kind (transparent plastic)	4000.00	\N
10582	18	ACON	girls hostel	450.00	\N
10583	18	MISC	security mess	500.00	\N
10584	18	REFRESHMENT	IVF refreshment	220.00	\N
10585	18	REFRESHMENT	labour refreshment	220.00	\N
10586	18	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	3300.00	\N
10587	18	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
10588	18	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(12000*1)	24000.00	\N
10589	18	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	28000.00	extra 8k
10590	18	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
13165	25	MEDICAL_CONSULTANT_CHARGES	3 OPD Consultant charges for Dr.PK	1050.00	\N
13166	25	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
13168	25	BAMON_KAMPU_CONSTRUCTION	Bricks	24900.00	\N
13169	25	ACON	ACON CONSTRUCTION	15000.00	(Tomthin electrical & Hardware)Electrical material  for  Boy's & Girls Hostel partly Payment
8349	19	DAILY_COLLECTION	SANATHOI (20000*2)	20000.00	\N
8350	19	MISC	FRONT FLOWER	100.00	\N
8351	19	ACON	GIRLS HOSTEL	1000.00	\N
8352	19	PROGRAM_&_FUNCTION	ACME	600.00	BPAM  FUNCTION (FLOWER POT)
8353	19	ACON	ACON CONSTRUCTION	600.00	BELCHAN 2 PCS
8354	19	URUP	ELECTRIC RECHARGE	2080.00	GIRLS HOSTEL
8355	19	RECHARGE	TV CABLE RECHARGE	500.00	\N
8356	19	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
8357	19	DAILY_COLLECTION	KEISHAMTHONG 15000	15000.00	\N
8358	19	PETROL	VAN PETROL	1000.00	\N
8359	19	MISC	THOI PHAOMEI	800.00	\N
8360	19	REFRESHMENT	IVF	270.00	\N
8361	19	REFRESHMENT	OT	250.00	\N
8362	19	ACON	ACON CONSTRUCTION	1400.00	\N
8363	19	CANTEEN_EXPENSES	MASALA	20.00	\N
8364	19	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	3440.00	\N
8365	19	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	4500.00	\N
8366	19	ACON	ACON CONSTRUCTION	500.00	PAPER PLATE
8367	19	DAILY_COLLECTION	ASWF(20000*2)	20000.00	\N
8655	20	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
8656	20	RECHARGE	NICU MOBILE RECHARGE	350.00	\N
8657	20	ACON	LABOUR REFRESHMENT	570.00	\N
8658	20	REFRESHMENT	IVF	270.00	\N
8659	20	REFRESHMENT	OT	260.00	\N
8660	20	MISC	MADAM TAILORING	40.00	\N
8661	20	WATER	ACME	1000.00	\N
8662	20	CANTEEN_EXPENSES	CANTEEN FISH	500.00	\N
8663	20	ACON	ACON CONSTRUCTION	1500.00	WATER BOOT & ALUMINIUM 10FT
8664	20	REPAIRING_&_SERVICING	VENTURE	7000.00	\N
8665	20	ACON	ACON CONSTRUCTION	36000.00	SAT FARMER  HIRING & lUNCH
8666	20	ACON	HOSTEL CHICKEN	850.00	\N
8667	20	REPAIRING_&_SERVICING	DELUXE-4  ac SERVICING	1500.00	\N
8668	20	MEDICAL_CONSULTANT_CHARGES	USG WHOLE ABDOMEN CHARGES FOR DR.SANJIT	1680.00	\N
8669	20	MISC	FRONT FLOWER	100.00	\N
8670	20	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	12000.00	PREVIOUS DUE
8671	20	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
8672	20	DAILY_COLLECTION	ASWF(20000*2)	20000.00	\N
8673	20	ACON	ACON CONSTRUCTION	29000.00	STONE CHIPS
8674	20	ACON	ACON CONSTRUCTION	29000.00	SAND
15194	27	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
10923	22	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	35000.00	\N
10924	22	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
10925	22	DAILY_COLLECTION	SANATHOI (20000*2)	55000.00	\N
10926	22	MISC	Patient Refund	900.00	2 O/C
10927	22	REFRESHMENT	OT	220.00	\N
10928	22	REFRESHMENT	IVF	250.00	\N
10929	22	REPAIRING_&_SERVICING	MEDICAL INSTRUMENTS	6000.00	\N
10930	22	MISC	Dismantle for Wangkhei	35000.00	\N
10931	22	STORE_MARKETING	MEDICINE & CONSUMABLES ITEMS	4340.00	\N
10932	22	CANTEEN_EXPENSES	CANTEEN MARKETING-(DRY ITEMS)	3400.00	\N
10933	22	REPAIRING_&_SERVICING	VEHICLE	4000.00	\N
10934	22	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	3530.00	\N
10935	22	HOSPITAL_EXPENSES	Patient Phanek	5600.00	\N
10936	22	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
15195	27	HUMANKIND_EXPENSES	Courier Charges for Dalcon	2130.00	\N
15196	27	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
15197	27	DAILY_COLLECTION	SANATHOI (20000*2)	20000.00	\N
15198	27	DAILY_COLLECTION	KEISHAMTHONG ( GOLDEN ) RS15,000*1	15000.00	\N
15199	27	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
15200	27	REPAIRING_&_SERVICING	Thar washing service charges	500.00	\N
15201	27	URUP	Milk for Goat	1000.00	\N
15202	27	DIESEL	Venture	1000.00	\N
15203	27	VENDOR	SB Surgical	8200.00	\N
15204	27	REFRESHMENT	OT	120.00	\N
20599	36	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
20600	36	MEDICAL_CONSULTANT_CHARGES	Pathology salary for the month of July'26	15000.00	\N
20601	36	STAFF	TA for Shanti(Lab Dept.)	400.00	\N
10424	21	PRINTING_AND_STATIONARY	BPAM	180.00	\N
10425	21	PRINTING_AND_STATIONARY	Non Judicial Paper	200.00	\N
10426	21	ACON	ACON CONSTRUCTION	250.00	Utensil Rental
10427	21	MEDICAL_CONSULTANT_CHARGES	USG WHOLE ABDOMEN CHARGES FOR DR.SANJIT	840.00	\N
10428	21	DAILY_COLLECTION	KEISHAMTHONG ( GOLDEN ) RS15,000*1	35000.00	\N
10429	21	REFRESHMENT	ACON CONSTRUCTION	100.00	\N
10430	21	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	2160.00	\N
10431	21	DIESEL	Diesel for Venture	1000.00	Venture
10432	21	MISC	Security Mess	2000.00	\N
10433	21	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
10434	21	STORE_MARKETING	MEDICINE & CONSUMABLES ITEMS	10000.00	\N
10435	21	ACON	PETROL	200.00	\N
10436	21	DAILY_COLLECTION	SANATHOI (20000*2)	55000.00	\N
10437	21	ACON	ACON CONSTRUCTION	29000.00	Sand
10438	21	ACON	ACON CONSTRUCTION	500.00	\N
10439	21	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	400.00	\N
10440	21	MARKETING	BPAM Coffee Mug	5000.00	\N
10441	21	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	100.00	Bakery
10442	21	WATER	WATER TANKER	2000.00	Acme & ACON
10443	21	BAMON_KAMPU_CONSTRUCTION	Brick	24900.00	Brick
10444	21	PETROL	Van Petrol	1000.00	\N
10445	21	ACON	ACON CONSTRUCTION	29000.00	Stone Chips
20602	36	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
20603	36	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
20604	36	STAFF	Salary for Hiam (Lab. dept.)	310.00	\N
20605	36	DONATION	Konung Leikai Nupi Kanglup	3000.00	\N
20606	36	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	2330.00	\N
20607	36	COFFEE_SHOP_MARKETING	Bakery items	200.00	\N
20608	36	ACON	ACON CONSTRUCTION	180.00	Labour refreshment for Hostel
20609	36	CANTEEN_EXPENSES	Rice Bag	1900.00	\N
20610	36	IVF_EXPENSES	Refreshment	350.00	\N
20611	36	REFRESHMENT	OT	210.00	\N
20612	36	ACON	ACON CONSTRUCTION	660.00	Labour Refreshment for Hostel
20613	36	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
23269	39	RECHARGE	MOBILE RECHARGE FOR FRONT DEPT.	200.00	\N
23270	39	MISC	Flower for Front	100.00	\N
23271	39	BAMON_KAMPU_CONSTRUCTION	Stone Dust	8500.00	\N
23272	39	ACON	ELECTRIC RECHARGE	2050.00	\N
23273	39	MEDICINES_ITEMS	S75	1560.00	\N
23274	39	MISC	Cash return for Satyam from Front	100.00	\N
16902	29	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
16903	29	DAILY_COLLECTION	KEISHAMTHONG ( GOLDEN ) RS15,000*1	15000.00	\N
16904	29	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
16905	29	HOSPITAL_EXPENSES	PRINTING & STATIONERY ITEMS	600.00	Paper Bag
16906	29	ACON	ACON CONSTRUCTION	200.00	Inch Tape & Chopper Box
16907	29	REFRESHMENT	IVF	220.00	\N
16908	29	REFRESHMENT	OT	210.00	\N
16909	29	CANTEEN_EXPENSES	CANTEEN MARKETING-(DRY ITEMS)	200.00	\N
16910	29	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	2850.00	\N
16911	29	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	4500.00	\N
16912	29	HOSPITAL_EXPENSES	Paint Repairing	2000.00	\N
16913	29	ACON	ACON CONSTRUCTION	800.00	Water
16914	29	CANTEEN_EXPENSES	CANTEEN MARKETING-(DRY ITEMS)	16000.00	\N
16915	29	ACON	ACON CONSTRUCTION	3000.00	Ply Board
16916	29	ACON	ACON CONSTRUCTION	4000.00	Fog Light
16917	29	ACON	ACON CONSTRUCTION	90.00	Refreshment
16918	29	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
16919	29	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
16920	29	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
16921	29	MEDICAL_CONSULTANT_CHARGES	Anaesthesia for Dr. Bidya	4100.00	\N
19232	34	ACON	ACON CONSTRUCTION	4500.00	Labour charge for earthwork
19233	34	DAILY_COLLECTION	KEISHAMTHONG ( GOLDEN ) RS15,000*1	15000.00	\N
19234	34	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
19235	34	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
19236	34	DAILY_COLLECTION	ASWF(20000*2)	20000.00	\N
18945	33	WATER	ACME	1000.00	\N
18946	33	MISC	FRONT FLOWER	50.00	\N
18947	33	ACON	MARKETING	10000.00	\N
18948	33	ACON	ACON CONSTRUCTION	390.00	\N
18949	33	PETROL	VAN PETROL	1000.00	\N
15789	28	REFRESHMENT	OT	260.00	\N
15790	28	ACON	ACON CONSTRUCTION	300.00	Labour Refreshment for Hostel
15791	28	ACON	ACON CONSTRUCTION	60.00	Labour Refreshment for Hostel
15792	28	PETROL	Van	1000.00	\N
15793	28	WATER	WATER TANKER(Acme)	1000.00	\N
15794	28	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
15795	28	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
15796	28	DAILY_COLLECTION	KEISHAMTHONG ( GOLDEN ) RS15,000*1	15000.00	\N
15797	28	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
15798	28	ACON	WATER TANKER	1000.00	\N
15799	28	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
15800	28	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
15801	28	STORE_MARKETING	MEDICINE & CONSUMABLES ITEMS	15000.00	\N
15802	28	COFFEE_SHOP_MARKETING	Bakery items	600.00	\N
15803	28	ACON	ACON CONSTRUCTION	200.00	Labour Refreshment for Hostel
15804	28	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	3430.00	\N
18950	33	ACON	ACON CONSTRUCTION	800.00	WATER
18951	33	COFFEE_SHOP_MARKETING	MARKETING	3000.00	\N
18952	33	ACON	ACON CONSTRUCTION	80.00	\N
18953	33	WATER	Water Jar	50.00	\N
18954	33	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
18955	33	CONSUMABLES_ITEMS	Coir Rope	750.00	\N
18956	33	ACON	Boy Hostel Construction Labour Charges	2800.00	\N
21509	37	DAILY_COLLECTION	ASWF(20000*2)	20000.00	\N
21510	37	SECURITY_MESS	Security Mess fee	500.00	\N
21511	37	CANTEEN_EXPENSES	Rice for ACON Hostel	2500.00	\N
21512	37	PETROL	Van	1000.00	\N
21513	37	DAILY_COLLECTION	KEISHAMTHONG ( GOLDEN ) RS15,000*1	15000.00	\N
21514	37	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
21515	37	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
21516	37	CANTEEN_EXPENSES	Iron rack for Canteen	6000.00	\N
21517	37	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	3680.00	\N
21518	37	DIESEL	Venture  	1000.00	\N
21519	37	CANTEEN_EXPENSES	Utensil for ACON Hostel	9000.00	\N
21520	37	VENDOR	Alpha Store(Partly Payment)	10000.00	\N
21521	37	ACON	ACON CONSTRUCTION	7000.00	stone dust for Hostel
21522	37	CANTEEN_EXPENSES	CANTEEN MARKETING-(DRY ITEMS)	14950.00	SOMO
19874	35	COFFEE_SHOP_MARKETING	COFFEE SHOP (DISPO)	200.00	\N
19875	35	ACON	ACON CONSTRUCTION	5000.00	Machine Hiring
19876	35	ACON	ACON CONSTRUCTION	14000.00	Ballu Single(5 Trips)=2800*5
19877	35	BAMON_KAMPU_CONSTRUCTION	Sand	8000.00	\N
19878	35	MISC	Patient refund for Old Case	500.00	\N
19879	35	REFRESHMENT	IVF	350.00	\N
19880	35	ACON	ACON CONSTRUCTION	280.00	\N
19881	35	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	2740.00	\N
19882	35	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
19883	35	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
19884	35	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
19885	35	HUMANKIND_EXPENSES	Courier Charges for ACROWELL	11480.00	\N
19886	35	LEGAL_&_LICENSE	Spirit License Renewal for ACME Hospital	1000.00	\N
19887	35	STORE_MARKETING	MEDICINE & CONSUMABLES ITEMS	15000.00	\N
19888	35	HOSPITAL_EXPENSES	Ballu single for Parking	7000.00	\N
17399	30	STAFF	STAFF SALARY	14650.00	1.Aman (MTS )-2640,\n2.Ronald (MTS)-2190\n3.Dev(MTS)-7630\n4.Santosh(MTS)-2190
19889	35	DAILY_COLLECTION	ASWF(20000*2)	20000.00	\N
18296	32	ACON	ACON CONSTRUCTION	450.00	Labour refreshment for ACON hospital
18297	32	PROGRAM_&_FUNCTION	WATER FOR SOCIAL SERVICE & Class for Sir Rocky)	200.00	\N
18298	32	ACON	ACON CONSTRUCTION	800.00	Earthwork for Hostel
17400	30	ACON	ACON CONSTRUCTION	19500.00	Cement 650*30(Hostel)
17401	30	CANTEEN_EXPENSES	Commercial gas for Canteen	3250.00	\N
17402	30	MEDICAL_CONSULTANT_CHARGES	USG WHOLE ABDOMEN CHARGES FOR DR.SANJIT	840.00	\N
17403	30	DAILY_COLLECTION	KEISHAMTHONG ( GOLDEN ) RS15,000*1	15000.00	\N
17404	30	REPAIRING_&_SERVICCING	MPC Care Clean	790.00	\N
17405	30	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
17406	30	PETROL	Van	1000.00	\N
17407	30	ACON	External class for Dr.Helena(500*2)	1000.00	\N
17408	30	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
17409	30	CANTEEN_EXPENSES	CANTEEN MARKETING-(DRY ITEMS)	2000.00	egg
17410	30	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	2260.00	\N
17411	30	LEGAL_&_LICENSE	ACME PROFESSIONAL TAX FY(2026-2027)	2500.00	\N
17412	30	ACON	ACON CONSTRUCTION	320.00	Labour refreshment for Hostel
17413	30	DAILY_COLLECTION	SANATHOI (20000*2)	20000.00	\N
18299	32	ACON	ACON CONSTRUCTION	19500.00	Cement(30bag*650 =19500)
18300	32	BAMON_KAMPU_CONSTRUCTION	Cements(20bag*650=13000)	13000.00	\N
18301	32	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	2090.00	\N
18302	32	URUP	URUP EXPENSES	19000.00	Staff Salary
18303	32	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
18304	32	HOME	Milk	360.00	\N
17948	31	CANTEEN_EXPENSES	CANTEEN-(CHICKEN)	5630.00	Dt.01/07/2026 to 14/08/2026
17949	31	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
17950	31	ACON	ACON CONSTRUCTION	27000.00	1. Stone chip 2Load(8500*2)=17000\n2. Sand 1Load(10000)=10000
17951	31	WATER	WATER TANKER	1000.00	for ACME
17952	31	ACON	ACON CONSTRUCTION	460.00	Labour Refreshment for hostel
17953	31	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	1720.00	\N
17954	31	ACON	ACON CONSTRUCTION	160.00	Labour Refreshment for Hostel
17955	31	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
17956	31	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
17957	31	ACON	Cotton Cloths	1500.00	\N
17958	31	ACON	WATER TANKER	1000.00	\N
17959	31	RECHARGE	Mobile recharge for Front dept.	200.00	\N
17960	31	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
17961	31	DIESEL	Thar (Diesel with Servicing)	6000.00	\N
17962	31	CANTEEN_EXPENSES	Rack Iron	3000.00	\N
17963	31	ACME-LABOUR_EXPENSE	Mattress for boy's Barrack	850.00	Mattres for Boys
17964	31	ACON	ACON CONSTRUCTION	130.00	Labour refreshment for ACON Hostel
17965	31	BAMON_KAMPU_CONSTRUCTION	Bricks	26700.00	\N
18305	32	CANTEEN_EXPENSES	Canteen Rack	600.00	\N
19221	34	WATER	WATER TANKER	1000.00	\N
19222	34	ACON	ACON CONSTRUCTION	300.00	Labour refreshment for Hostel
19223	34	ADVERTISING_&_PROMOTION	ACME DOCTERZ APP ADS (Neopath)	3000.00	\N
19224	34	URUP	Goat Milk and Medicine	1000.00	\N
19225	34	WATER	WATER TANKER	1000.00	\N
19226	34	WATER	WATER BOTTLE	1650.00	\N
19227	34	LEGAL_&_LICENSE	Shop License renewal for ACME Hospital(FY-2026-2027)	3000.00	\N
19228	34	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
19229	34	UTENSIL	Utensil rent 	100.00	\N
19230	34	PRINTING_AND_STATIONARY	Poster Printing for Antibiotics safety	180.00	\N
19231	34	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	2330.00	\N
21523	37	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	2790.00	\N
21524	37	REFRESHMENT	OT	920.00	\N
21525	37	ACON	ACON CONSTRUCTION	600.00	Labour refreshment for ACON Hostel
21526	37	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
21527	37	INVESTMENT	LORENDRO MARUP	455000.00	\N
21528	37	STORE_MARKETING	Simcon Tablet	3750.00	\N
21529	37	ACON	WATER TANKER	1000.00	\N
21530	37	ACON	ACON CONSTRUCTION	4500.00	Labour charges for Earthwork for ACON Hostel
21531	37	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
22496	38	GAS_EXPENSES	Liquid Nitrogen 52L.	5200.00	\N
22497	38	DAILY_COLLECTION	DAILY COLLECTION MARUP-RS.200	200.00	\N
22498	38	WATER	WATER  Jar	50.00	\N
22499	38	HOSPITAL_EXPENSES	Inch tape	100.00	\N
22500	38	DAILY_COLLECTION	ASWF(20000*2)	40000.00	\N
22501	38	ACON	ACON CONSTRUCTION	180.00	Labour Refreshment for Hostel
22502	38	ACON	ACON logo sticker( for MU Inspection)	770.00	\N
22503	38	COFFEE_SHOP_MARKETING	COFFEE SHOP MARKETING	500.00	Bakery items
22504	38	ACON	Flex for AV Aids	600.00	\N
22505	38	IVF_EXPENSES	Refreshment	170.00	\N
22506	38	ACON	ACON CONSTRUCTION	340.00	Labour refreshment for Hostel
22507	38	DAILY_COLLECTION	SANATHOI (15000*1)	15000.00	\N
22508	38	DAILY_COLLECTION	SANATHOI (20000*2)	40000.00	\N
22509	38	DAILY_COLLECTION	KEISHAMTHONG ( GOLDEN ) RS15,000*1	15000.00	\N
22510	38	DAILY_COLLECTION	KEISHAMTHONG/GOLDEN(20000*1)	20000.00	\N
22511	38	WATER	WATER TANKER(Acme)	1000.00	\N
22512	38	HOME	Servicing charges for Kinetic	3000.00	\N
22513	38	MISC	Patient refund(Blood test)	1150.00	\N
22514	38	MISC	Patient refund for Large biopsy change to Medium Biopsy	500.00	\N
22515	38	ACON	ACON CONSTRUCTION	32000.00	Sand
22516	38	ACON	ACON CONSTRUCTION	26700.00	Brick
22517	38	CANTEEN_EXPENSES	CANTEEN MARKETING-(VEGETABLES ITEMS)	3410.00	\N
22518	38	HOME	Milk & Vegetables	500.00	\N
23286	40	ACON	ACON CONSTRUCTION	600.00	Labour Refreshment for Hostel
\.


--
-- Data for Name: daily_ipd_admissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_ipd_admissions (id, report_id, patient_name, type, amount) FROM stdin;
\.


--
-- Data for Name: daily_ipd_discharges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_ipd_discharges (id, report_id, patient_name, amount) FROM stdin;
\.


--
-- Data for Name: daily_payment_channels; Type: TABLE DATA; Schema: public; Owner: -
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
18170	32	ICICI	UPI	Canteen	1100.00
18171	32	CASH	CASH	Canteen	910.00
18172	32	CASH	CASH	Front(Night)	50750.00
18173	32	ICICI	UPI	IPD(Night)	3500.00
18174	32	ICICI	DEBIT CARD	OPD(Morng)	500.00
18175	32	ICICI	UPI	OPD(Morng)	12320.00
18176	32	CASH	CASH	Front(Morng)	4610.00
18177	32	ICICI	UPI	Coffeeshop	380.00
18178	32	CASH	CASH	Coffeeshop	460.00
18179	32	CASH	CASH	Pharm	8320.00
18180	32	HDFC	DEBIT CARD	Pharm	1530.00
18181	32	HDFC	UPI	Pharm	17773.00
18182	32	ICICI	UPI	OPD(Eveng)	500.00
18183	32	CASH	CASH	Front(Eveng)	100.00
5649	13	ICICI	UPI	opd(Front)	37636.00
5650	13	ICICI	DEBIT CARD	INJECTION	2019.00
5651	13	ICICI	UPI	INJECTION	19470.00
5652	13	ICICI	UPI	COFFEE	830.00
5653	13	ICICI	UPI	CANTEEN	610.00
5654	13	HDFC	CREDIT CARD	PHARM	221.00
3802	14	ICICI	UPI	Front (Night)	220.00
3803	14	ICICI	DEBIT CARD	IPD (Debit Card) 	44700.00
3804	14	ICICI	UPI	front(OPD)	18850.00
3805	14	ICICI	CREDIT CARD	Front IPD 	894.00
3806	14	ICICI	UPI	IPD	55300.00
3807	14	ICICI	UPI	Immunization 	75785.00
3808	14	ICICI	UPI	INJECTION	25214.00
3809	14	ICICI	UPI	coffeeshop	355.00
3810	14	ICICI	UPI	Canteen 	1470.00
3811	14	HDFC	CREDIT CARD	Pharm	6010.00
3812	14	HDFC	UPI	Opd	26700.00
3813	14	CASH	CASH	Total	173100.00
5655	13	HDFC	DEBIT CARD	PHARM	4560.00
5656	13	HDFC	UPI	PHARM	25859.00
5657	13	CASH	CASH	TOTAL	251033.00
16614	30	CASH	CASH	Front(Night)	47870.00
16615	30	CASH	CASH	Front(Morng)	5350.00
15377	28	ICICI	UPI	IPD	33300.00
15378	28	ICICI	UPI	OPD	600.00
15379	28	CASH	CASH	FRONT(Night)	53000.00
15380	28	ICICI	UPI	Canteen	460.00
15381	28	CASH	CASH	Canteen	1580.00
15382	28	ICICI	UPI	Coffeeshop	900.00
15383	28	CASH	CASH	Coffeeshop	760.00
15384	28	HDFC	UPI	Pharm	48481.00
3970	15	ICICI	UPI	IPD(night)	48700.00
3971	15	ICICI	DEBIT CARD	OPD	19920.00
3972	15	ICICI	UPI	OPD	33846.00
3973	15	ICICI	CREDIT CARD	OPD	15200.00
3974	15	ICICI	UPI	IPD	20400.00
3975	15	ICICI	UPI	INJECTION	21800.00
3976	15	ICICI	UPI	Coffeeshop	950.00
3977	15	ICICI	UPI	Canteen Shop	1360.00
3214	10	ICICI	UPI	OPD(NIGHT)	14990.00
3215	10	ICICI	UPI	IPD(night)	30200.00
3216	10	ICICI	CREDIT CARD	IPD(night)	35700.00
3217	10	ICICI	DEBIT CARD	OPD	50000.00
3218	10	ICICI	UPI	OPD	145510.00
3219	10	ICICI	UPI	IPD	58300.00
3220	10	ICICI	DEBIT CARD	INJECTION	2019.00
3221	10	ICICI	UPI	INJECTION	25545.00
3222	10	ICICI	UPI	Coffee Shop 	1170.00
3223	10	ICICI	UPI	Canteen	770.00
3224	10	HDFC	UPI	Pharmacy (UPI)	48435.00
15385	28	CASH	CASH	Pharm	35080.00
15386	28	ICICI	UPI	IPD(Morng)	38200.00
15387	28	ICICI	UPI	OPD(Morng)	33915.00
15388	28	CASH	CASH	Front(Morng)	85820.00
15389	28	ICICI	UPI	IPD(eveng)	36000.00
15390	28	ICICI	UPI	OPD(eveng)	3820.00
15391	28	CASH	CASH	Front(Eveng)	15320.00
11299	23	ICICI	UPI	OPD(Night)	8420.00
11300	23	CASH	CASH	OPD(Night)	80900.00
11301	23	CASH	CASH	OPD (Morng.)	23870.00
11302	23	ICICI	UPI	IPD(Morng)	190.00
11303	23	ICICI	UPI	OPD(Morng)	23970.00
11304	23	ICICI	UPI	Canteen	625.00
11305	23	CASH	CASH	Canteen	1350.00
11306	23	HDFC	UPI	Pharm	35994.00
3978	15	HDFC	CREDIT CARD	Pharm	3690.00
3979	15	HDFC	DEBIT CARD	Pharm	4920.00
3980	15	HDFC	UPI	Pharm	31313.00
3981	15	CASH	CASH	TOTAL	277614.00
11307	23	CASH	CASH	Pharm	17030.00
10264	21	ICICI	UPI	Injection	22130.00
10265	21	ICICI	DEBIT CARD	Injection	1242.00
5563	17	ICICI	UPI	OPD(Night)	40000.00
5564	17	ICICI	DEBIT CARD	OPD	750.00
10266	21	ICICI	UPI	Front IPD Night	20000.00
5565	17	ICICI	CREDIT CARD	OPD	459.00
5566	17	ICICI	UPI	IPD	45600.00
5567	17	ICICI	UPI	Medicine Sales 	1320.00
5568	17	ICICI	UPI	IVF	150000.00
5569	17	ICICI	UPI	INJECTION	37974.00
3225	10	CASH	CASH	TOTAL	348368.00
5570	17	ICICI	UPI	Canteen 	1010.00
5571	17	ICICI	UPI	Coffee	890.00
5572	17	ICICI	UPI	OPD	62160.00
5573	17	HDFC	UPI	Pharm	37670.00
5574	17	CASH	CASH	TOTAL	225678.00
10267	21	ICICI	UPI	Front OPD Night	3520.00
10268	21	CASH	CASH	Front Night	6530.00
10269	21	ICICI	UPI	Front IPD	1000.00
10270	21	ICICI	UPI	Front OPD	66530.00
10271	21	CASH	CASH	Front	95250.00
10272	21	ICICI	UPI	Canteen	350.00
10273	21	CASH	CASH	Canteen	1400.00
10274	21	ICICI	UPI	Pharmacy	64273.00
10275	21	CASH	CASH	Pharmacy	25250.00
10276	21	ICICI	CREDIT CARD	Front Evening	38964.00
10277	21	CASH	CASH	ACON & Coffee Shop	140.00
10278	21	ICICI	UPI	Coffee Shop	1085.00
10279	21	CASH	CASH	Coffee Shop	1460.00
10280	21	CASH	CASH	Parking	250.00
10281	21	CASH	CASH	Injection	4730.00
11308	23	ICICI	UPI	OPD(eveng)	750.00
11309	23	CASH	CASH	OPD(eveng)	13840.00
11310	23	CASH	CASH	Parking	280.00
11311	23	ICICI	UPI	Injection	20904.00
11312	23	CASH	CASH	Injection	380.00
11313	23	CASH	CASH	Coffeeshop	1380.00
11314	23	ICICI	UPI	Coffeeshop	1010.00
15392	28	ICICI	UPI	Injection	13586.00
15393	28	CASH	CASH	Parking	130.00
16616	30	ICICI	UPI	OPD(Morng)	28812.00
9055	20	CASH	CASH	PHARMACY	21340.00
9056	20	ICICI	UPI	IVF INJECTION	10240.00
9057	20	ICICI	DEBIT CARD	IVF INJECTION	4050.00
9058	20	ICICI	UPI	MEDICINE SALES	1135.00
9059	20	CASH	CASH	MEDICINE SALES	190.00
9060	20	ICICI	UPI	IMMUNIZATION EVENING	12793.00
9061	20	ICICI	UPI	IMMUNIZATION EVENING	4786.00
9062	20	ICICI	DEBIT CARD	IMMUNIZATION EVENING	5883.00
9063	20	ICICI	UPI	IMMUNIZATION MORNING	7333.00
9064	20	ICICI	UPI	FRONT EVENING IPD	41200.00
9065	20	ICICI	UPI	FRONT EVENING OPD	19420.00
9066	20	CASH	CASH	FRONT EVENING	26420.00
9067	20	CASH	CASH	PARKING	280.00
9068	20	ICICI	DEBIT CARD	IMMUNIZATION MORNING	3225.00
10450	18	ICICI	UPI	front night	40000.00
10451	18	CASH	CASH	front night	20300.00
10452	18	HDFC	UPI	pharmacy	42069.00
10453	18	HDFC	DEBIT CARD	pharmacy	940.00
10454	18	CASH	CASH	pharmacy	10950.00
10455	18	ICICI	UPI	injection	43073.00
10456	18	CASH	CASH	injection	960.00
10457	18	ICICI	UPI	canteen	270.00
10458	18	CASH	CASH	canteen	1780.00
10459	18	ICICI	UPI	coffee	500.00
10460	18	CASH	CASH	coffee	1380.00
10461	18	ICICI	UPI	front morning opd	42063.00
10462	18	ICICI	UPI	front morning ipd	1500.00
10463	18	ICICI	DEBIT CARD	front morning opd	950.00
10464	18	CASH	CASH	front morning	26500.00
10465	18	CASH	CASH	front evening	6060.00
10466	18	CASH	CASH	parking	200.00
13607	26	ICICI	DEBIT CARD	Front	9800.00
13608	26	ICICI	CREDIT CARD	Front	12240.00
13609	26	ICICI	UPI	Front	130963.00
13610	26	CASH	CASH	Front	237290.00
13611	26	ICICI	UPI	Front Night	5000.00
3554	11	ICICI	UPI	IPD(NIGHT)	30000.00
3555	11	ICICI	DEBIT CARD	OPD	2420.00
3556	11	ICICI	UPI	OPD	48480.00
3557	11	ICICI	CREDIT CARD	IPD	4590.00
3558	11	ICICI	UPI	IPD	22000.00
3559	11	ICICI	UPI	Medicine Sales 	4514.00
3560	11	ICICI	UPI	Injection	14964.00
3561	11	ICICI	UPI	Coffee Shop 	820.00
3562	11	ICICI	UPI	 Canteen	490.00
3563	11	HDFC	UPI	Pharmacy 	27391.00
3564	11	HDFC	CREDIT CARD	Pharmacy 	5100.00
3565	11	CASH	CASH	Total	195179.00
13612	26	ICICI	DEBIT CARD	Front Night	2000.00
13613	26	CASH	CASH	Front Night	220.00
13614	26	ICICI	UPI	Coffee Shop	625.00
13615	26	CASH	CASH	Coffee Shop	1190.00
13616	26	ICICI	UPI	Immunization	36125.00
13617	26	CASH	CASH	Immunization	23400.00
13618	26	CASH	CASH	Parking	300.00
9127	12	HDFC	UPI	PHARMACY	43812.00
9128	12	HDFC	DEBIT CARD	PHARMACY	6545.00
8557	19	ICICI	UPI	FRONT NIGHT IPD	44300.00
8558	19	ICICI	UPI	FRONT NIGHT OPD	600.00
8559	19	CASH	CASH	FRONT NIGHT	7500.00
8560	19	ICICI	UPI	FRONT NIGHT	2366.00
8561	19	ICICI	UPI	FRONT MORNING IPD	76900.00
8562	19	ICICI	UPI	FRONT MORNING OPD	23715.00
8563	19	ICICI	CREDIT CARD	FRONT MORNING OPD	612.00
8564	19	ICICI	UPI	FRONT MORNING	450.00
8565	19	CASH	CASH	FRONT MORNING	40740.00
8566	19	HDFC	UPI	PHARMACY	34759.00
8567	19	HDFC	CREDIT CARD	PHARMACY	2300.00
8568	19	CASH	CASH	PHARMACY	23850.00
8569	19	CASH	CASH	PARKING	200.00
8570	19	ICICI	UPI	CANTEEN	390.00
8571	19	CASH	CASH	CANTEEN	2940.00
8572	19	CASH	CASH	MEDICINE SALES	190.00
8573	19	ICICI	UPI	FRONT EVENING IPD	36800.00
8574	19	CASH	CASH	FRONT EVENING	5910.00
8575	19	ICICI	UPI	COFFEE	395.00
8576	19	CASH	CASH	COFFEE	700.00
8577	19	ICICI	UPI	OPD INJECTION	33144.00
8578	19	CASH	CASH	OPD INJECTION	2560.00
9129	12	HDFC	CREDIT CARD	PHARMACY	4650.00
9130	12	CASH	CASH	PHARMACY	32038.00
9131	12	ICICI	UPI	FRONT IPD	55300.00
9132	12	ICICI	CREDIT CARD	FRONT OPD	600.00
9133	12	ICICI	UPI	FRONT OPD	33560.00
9134	12	CASH	CASH	FRONT MORNING	39490.00
9135	12	ICICI	UPI	front ipd	104500.00
9136	12	ICICI	UPI	front opd	36540.00
9137	12	CASH	CASH	front evening	276840.00
9138	12	ICICI	UPI	coffee shop	480.00
9069	20	CASH	CASH	IMMUNIZATION MORNING	5000.00
9070	20	CASH	CASH	IMMUNIZATION EVENING	13210.00
9071	20	ICICI	UPI	COFFEE	280.00
9072	20	ICICI	UPI	CANTEEN	820.00
9073	20	CASH	CASH	COFFEE	1390.00
9074	20	CASH	CASH	CANTEEN	2230.00
9075	20	ICICI	UPI	OPD INJECTION	16998.00
9076	20	CASH	CASH	OPD INJECTION	4000.00
9077	20	ICICI	UPI	FRONT NIGHT IPD	41000.00
9078	20	ICICI	DEBIT CARD	FRONT NIGHT IPD	1200.00
9079	20	ICICI	UPI	FRONT NIGHT OPD	5000.00
9080	20	CASH	CASH	FRONT NIGHT	1750.00
9081	20	ICICI	DEBIT CARD	FRONT MORNING OPD	2170.00
9082	20	ICICI	UPI	FRONT MORNING OPD	50260.00
9083	20	CASH	CASH	FRONT MORNING	56180.00
9084	20	HDFC	UPI	PHARMACY	32286.00
9085	20	HDFC	DEBIT CARD	PHARMACY	6979.00
9086	20	HDFC	CREDIT CARD	PHARMACY	1537.00
9139	12	CASH	CASH	coffee shop	1040.00
9140	12	ICICI	UPI	human kind 	377.00
9141	12	ICICI	UPI	canteen	1080.00
9142	12	CASH	CASH	canteen	1080.00
9143	12	ICICI	UPI	Injection	36588.00
9144	12	ICICI	UPI	Front Night	2000.00
9145	12	CASH	CASH	Front Night	450.00
9146	12	ICICI	DEBIT CARD	OPD	750.00
12969	25	ICICI	UPI	Front(opd)night	1050.00
12970	25	ICICI	UPI	Front(IPD)Night	4000.00
12971	25	ICICI	UPI	IPD(Morng)	36500.00
12972	25	ICICI	DEBIT CARD	OPD(Morng)	1300.00
12973	25	ICICI	UPI	OPD(Morng)	15850.00
12974	25	CASH	CASH	OPD(Morng)	75800.00
12975	25	ICICI	UPI	IVF- INJ	960.00
12976	25	ICICI	UPI	Canteen	450.00
12977	25	CASH	CASH	Canteen	1110.00
12978	25	HDFC	UPI	Pharm	26155.00
12979	25	HDFC	DEBIT CARD	Pharm	2920.00
12980	25	CASH	CASH	Pharm	25965.00
12981	25	CASH	CASH	Inj	6200.00
12982	25	ICICI	UPI	Inj	14608.00
12983	25	ICICI	DEBIT CARD	Inj	1380.00
12984	25	ICICI	UPI	Coffee shop	575.00
12985	25	CASH	CASH	Coffee shop	1290.00
12986	25	ICICI	UPI	Medicine sales	2085.00
12987	25	ICICI	UPI	IPD(Eveng)	58100.00
12988	25	ICICI	UPI	OPD(eveng)	7250.00
12989	25	ICICI	DEBIT CARD	OPD(eveng)	850.00
10864	22	CASH	CASH	Front Night	90500.00
10865	22	CASH	CASH	Front	342910.00
10866	22	ICICI	UPI	Front	155550.00
10867	22	ICICI	DEBIT CARD	Front	50000.00
10868	22	CASH	CASH	Canteen	1790.00
10869	22	ICICI	UPI	Canteen	580.00
10870	22	CASH	CASH	Cash return	1220.00
10871	22	CASH	CASH	Parking	250.00
10872	22	CASH	CASH	Coffee Shop	1360.00
10873	22	ICICI	UPI	Coffee Shop	1050.00
10874	22	CASH	CASH	Pharmacy	12335.00
10875	22	ICICI	UPI	Pharmacy	26752.00
10876	22	ICICI	CREDIT CARD	Pharmacy	1240.00
10877	22	ICICI	UPI	Injection	23572.00
12990	25	CASH	CASH	front(Eveng)	104570.00
13619	26	HDFC	UPI	Pharmacy	35726.00
13620	26	HDFC	DEBIT CARD	Pharmacy	3500.00
13621	26	HDFC	CREDIT CARD	Pharmacy	3127.00
13622	26	CASH	CASH	Pharmacy	42744.00
13623	26	ICICI	UPI	Injection	37554.00
13624	26	ICICI	DEBIT CARD	Injection	4400.00
16141	29	CASH	CASH	Front	130580.00
16142	29	ICICI	UPI	Front	71370.00
16143	29	CASH	CASH	Canteen	1250.00
16144	29	ICICI	UPI	Canteen	310.00
16145	29	ICICI	CREDIT CARD	Front	47944.00
16146	29	ICICI	DEBIT CARD	Front	450.00
16147	29	CASH	CASH	Parking	60.00
16148	29	HDFC	UPI	IVF Injection	4690.00
16149	29	ICICI	UPI	Coffee Shop	550.00
16150	29	CASH	CASH	Coffee Shop	990.00
16151	29	CASH	CASH	Injection	17750.00
16152	29	HDFC	UPI	Injection	31142.00
16153	29	HDFC	UPI	Pharmacy	32039.00
16154	29	CASH	CASH	Pharmacy	25890.00
16155	29	ICICI	UPI	Front Night	13550.00
18184	32	ICICI	UPI	Injection	5900.00
18185	32	CASH	CASH	Injection	8940.00
18186	32	HDFC	UPI	Injection	12590.00
18187	32	HDFC	DEBIT CARD	Injection	3460.00
18188	32	ICICI	UPI	OPD(Eveng)	700.00
18189	32	CASH	CASH	ACON CASH RETURN	1050.00
21915	36	CASH	CASH	Canteen	2920.00
21916	36	ICICI	UPI	Canteen	940.00
21917	36	ICICI	UPI	IPD(Night)	11200.00
21918	36	CASH	CASH	Parking	100.00
21919	36	ICICI	UPI	IPD(Morng)	2000.00
23756	38	CASH	CASH	Pharm	34280.00
23757	38	CASH	CASH	Medicine sales	1300.00
23758	38	CASH	CASH	Front(Eveng)	45350.00
23759	38	ICICI	UPI	IPD(Eveng)	30400.00
16617	30	ICICI	UPI	IPD (Morng)	2570.00
16618	30	CASH	CASH	Parking 	40.00
16619	30	CASH	CASH	Pharm	2430.00
16620	30	HDFC	UPI	Pharm	20660.00
16621	30	ICICI	UPI	Coffeeshop	910.00
16622	30	CASH	CASH	Coffeeshop	290.00
16623	30	ICICI	UPI	OPD(eveng)	5388.00
16624	30	CASH	CASH	Front(eveng)	40010.00
16625	30	ICICI	UPI	Injection	13600.00
16626	30	CASH	CASH	Injection	15540.00
16627	30	ICICI	UPI	Canteen	900.00
16628	30	CASH	CASH	Canteen	940.00
23760	38	ICICI	UPI	OPD(Eveng)	23540.00
23761	38	OTHERS	UPI	Razorpay	500.00
23762	38	CASH	CASH	Parking	150.00
23763	38	CASH	CASH	Front(Night)	3700.00
20030	34	CASH	CASH	Front(Night)	5820.00
20031	34	ICICI	UPI	Canteen	800.00
20032	34	CASH	CASH	Canteen	1760.00
20033	34	CASH	CASH	Front(Morng)	11720.00
17269	31	ICICI	UPI	Canteen	960.00
17270	31	CASH	CASH	Canteen	1410.00
17271	31	ICICI	DEBIT CARD	IPD(Night)	11500.00
17272	31	CASH	CASH	Front(morng)	125720.00
17273	31	ICICI	CREDIT CARD	IPD(morng)	4080.00
17274	31	ICICI	UPI	OPD(Morng)	93865.00
17275	31	ICICI	UPI	Coffeeshop	595.00
17276	31	CASH	CASH	Coffeeshop	660.00
17277	31	HDFC	UPI	Pharm	25802.00
17278	31	HDFC	CREDIT CARD	Pharm	1590.00
17279	31	CASH	CASH	Pharm	15100.00
17280	31	CASH	CASH	Front(Eveng)	5450.00
17281	31	ICICI	CREDIT CARD	IPD(eveng)	8976.00
17282	31	ICICI	UPI	IPD(eveng)	49400.00
17283	31	ICICI	UPI	OPD(eveng)	5700.00
17284	31	CASH	CASH	Parking	50.00
17285	31	CASH	CASH	Injection	25380.00
17286	31	ICICI	UPI	Injection	16688.00
20034	34	ICICI	UPI	OPD(Morng)	24390.00
20035	34	CASH	CASH	Front(Eveng)	5000.00
20036	34	ICICI	UPI	IPD(UPI)	13500.00
20037	34	ICICI	UPI	Injection	17410.00
20038	34	CASH	CASH	Injection	5370.00
20039	34	HDFC	UPI	Pharm	16180.00
20040	34	CASH	CASH	Pharm	11240.00
20041	34	ICICI	UPI	Coffeeshop	510.00
20042	34	CASH	CASH	Coffeeshop	470.00
23764	38	ICICI	UPI	IPD(UPI)Night	5200.00
23765	38	ICICI	UPI	OPD(UPI)night	8620.00
23766	38	CASH	CASH	Canteen	1640.00
23767	38	ICICI	UPI	Canteen	1090.00
23768	38	CASH	CASH	Front(Morng)	118310.00
23769	38	ICICI	DEBIT CARD	OPD(morng)	500.00
23770	38	OTHERS	UPI	Resorpay	9500.00
23771	38	ICICI	UPI	OPD(morng)	19680.00
23772	38	HDFC	UPI	Pharm	30038.00
23773	38	HDFC	DEBIT CARD	Pharm	2210.00
23774	38	CASH	CASH	Coffeeshop	1510.00
23775	38	ICICI	UPI	Coffeeshop	930.00
23776	38	CASH	CASH	Injection	1980.00
23777	38	ICICI	DEBIT CARD	Injection	2335.00
23778	38	ICICI	UPI	Injection	10130.00
12037	24	ICICI	UPI	OPD(eveng)	2500.00
12038	24	ICICI	DEBIT CARD	IPD(night)	54000.00
12039	24	ICICI	UPI	OPD(night)	2450.00
12040	24	ICICI	UPI	OPD(morng)	9000.00
12041	24	ICICI	UPI	IPD(morng)	27930.00
12042	24	CASH	CASH	OPD(morng)	387320.00
12043	24	CASH	CASH	OPD(night)	2890.00
12044	24	ICICI	UPI	Canteen	1540.00
12045	24	CASH	CASH	Canteen	3870.00
12046	24	CASH	CASH	Parking	230.00
12047	24	ICICI	UPI	Coffee shop	360.00
12048	24	CASH	CASH	Coffee shop	920.00
12049	24	ICICI	UPI	Injection	15514.00
12050	24	HDFC	UPI	Pharm	31342.00
12051	24	CASH	CASH	Pharm	36225.00
12052	24	CASH	CASH	Medicine sales	2385.00
12053	24	ICICI	UPI	IPD(Eveng)	125000.00
12054	24	CASH	CASH	OPD(Eveng)	50620.00
12055	24	ICICI	UPI	IVF-inj	14700.00
14522	27	CASH	CASH	OPD(Morng)	92290.00
14523	27	ICICI	DEBIT CARD	IPD(Morng)	8500.00
14524	27	ICICI	UPI	OPD(Morng)	19220.00
14525	27	ICICI	UPI	Canteen	470.00
14526	27	CASH	CASH	Canteen	2190.00
14527	27	ICICI	UPI	IPD(night)	44300.00
14528	27	ICICI	UPI	OPD(Night)	1760.00
14529	27	CASH	CASH	OPD(Night)	52000.00
14530	27	HDFC	UPI	Pharm	40590.00
14531	27	HDFC	DEBIT CARD	Pharm	1256.00
14532	27	CASH	CASH	Pharm	30730.00
14533	27	CASH	CASH	Parking	280.00
14534	27	CASH	CASH	Coffeeshop	1630.00
14535	27	ICICI	UPI	Coffeeshop	285.00
14536	27	CASH	CASH	Injection	2920.00
14537	27	ICICI	DEBIT CARD	Injection	2070.00
14538	27	ICICI	UPI	Injection	11764.00
14539	27	ICICI	CREDIT CARD	IPD(eveng)	62420.00
14540	27	ICICI	DEBIT CARD	OPD(Eveng)	950.00
14541	27	ICICI	UPI	IPD(eveng)	56900.00
14542	27	ICICI	UPI	OPD(Eveng)	29080.00
14543	27	CASH	CASH	OPD(Eveng)	20984.00
21920	36	ICICI	DEBIT CARD	IPD(Morng)	8400.00
21921	36	ICICI	DEBIT CARD	OPD(Morng)	750.00
21922	36	OTHERS	UPI	OPD(Morng)Razorpay	7500.00
21923	36	ICICI	UPI	OPD(Morng)	9620.00
21924	36	CASH	CASH	Front(Morng)	53500.00
21925	36	CASH	CASH	Medicine sales	1500.00
21926	36	ICICI	UPI	Medicine sales	820.00
21927	36	ICICI	UPI	IVF -Injection	5060.00
21928	36	ICICI	UPI	Coffeeshop	720.00
21929	36	CASH	CASH	Coffeeshop	1980.00
21930	36	HDFC	UPI	Pharm	23051.00
21931	36	HDFC	CREDIT CARD	Pharm	530.00
21932	36	HDFC	DEBIT CARD	Pharm	1200.00
21933	36	CASH	CASH	Pharm	20820.00
21934	36	CASH	CASH	Front(eveng)	25850.00
21935	36	ICICI	CREDIT CARD	IPD(eveng)	13464.00
21936	36	ICICI	DEBIT CARD	OPD(eveng)	2120.00
21937	36	ICICI	UPI	OPD(eveng)	9750.00
21938	36	ICICI	UPI	IPD(eveng)	76300.00
21939	36	OTHERS	UPI	OPD(Eveng)Razorpay	2200.00
21940	36	ICICI	UPI	Injection	10350.00
21941	36	ICICI	DEBIT CARD	Injection	2335.00
20784	35	CASH	CASH	Front(eveng)	9770.00
20785	35	OTHERS	UPI	OPD(Razorpay)	2000.00
20786	35	ICICI	UPI	Canteen	770.00
20787	35	CASH	CASH	Canteen	2050.00
20788	35	ICICI	DEBIT CARD	OPD(morng)	1450.00
20789	35	ICICI	UPI	OPD(morng)	56930.00
20790	35	CASH	CASH	Front (Morng)	110670.00
20791	35	CASH	CASH	Coffeeshop	1600.00
20792	35	ICICI	UPI	Coffeeshop	790.00
20793	35	ICICI	UPI	Medicine sales	2340.00
20794	35	HDFC	UPI	Pharm	31216.00
20795	35	HDFC	DEBIT CARD	Pharm	5210.00
20796	35	CASH	CASH	Pharm	12950.00
20797	35	CASH	CASH	Front(Night)	1560.00
20798	35	ICICI	UPI	IPD(eveng)	4000.00
20799	35	ICICI	UPI	OPD(eveng)	10860.00
20800	35	CASH	CASH	Parking	50.00
20801	35	CASH	CASH	Injection	11510.00
20802	35	ICICI	UPI	Injection	26780.00
20803	35	ICICI	DEBIT CARD	Injection	4190.00
22745	37	ICICI	UPI	IPD(Night)	44800.00
22746	37	CASH	CASH	Front(Night)	4200.00
19648	33	CASH	CASH	IMMUNIZATION	19833.00
19649	33	ICICI	UPI	FRONT EVENING IPD	30000.00
19650	33	ICICI	UPI	FRONT EVENING OPD	7000.00
19651	33	CASH	CASH	FRONT EVENING	8200.00
19652	33	ICICI	UPI	COFFEE SHOP	955.00
19653	33	CASH	CASH	Parking	150.00
19654	33	CASH	CASH	COFFEE SHOP	900.00
19655	33	ICICI	UPI	FRONT MORNING IPD	2000.00
19656	33	ICICI	CASH	FRONT MORNING OPD	13640.00
19657	33	CASH	CASH	FRONT MORNING	50600.00
19658	33	ICICI	UPI	IMMUNIZATION MORNING	13019.00
19659	33	ICICI	CREDIT CARD	IMMUNIZATION MORNING	5985.00
19660	33	CASH	CASH	FRONT MORNING	13659.00
19661	33	ICICI	UPI	CANTEEN	980.00
19662	33	CASH	CASH	CANTEEN	650.00
19663	33	HDFC	UPI	PHARMACY	23954.00
19664	33	CASH	CASH	PHARMACY	13490.00
19665	33	ICICI	CREDIT CARD	IMMUNIZATION	4970.00
19666	33	ICICI	DEBIT CARD	IMMUNIZATION	7470.00
19667	33	ICICI	UPI	IMMUNIZATION	16990.00
19668	33	ICICI	UPI	Injection OPD	25890.00
19669	33	ICICI	DEBIT CARD	Injection OPD	1840.00
19670	33	CASH	CASH	Injection OPD	9740.00
22747	37	ICICI	DEBIT CARD	IPD(Morng)	3700.00
22748	37	ICICI	DEBIT CARD	OPD(Morng)	7320.00
22749	37	ICICI	UPI	IPD(Morng)	6600.00
22750	37	ICICI	UPI	OPD(Morng	23900.00
22751	37	OTHERS	UPI	RAZORPAY(OPD-Morng)	11000.00
22752	37	CASH	CASH	Front (Morng)	57280.00
22753	37	CASH	CASH	Parking	150.00
22754	37	ICICI	UPI	Medicine sales	2412.00
22755	37	CASH	CASH	Canteen	2000.00
22756	37	ICICI	UPI	Canteen	920.00
22757	37	ICICI	UPI	Coffeeshop	565.00
22758	37	CASH	CASH	Coffeeshop	500.00
22759	37	HDFC	UPI	Pharm	41580.00
22760	37	HDFC	DEBIT CARD	Pharm	2700.00
22761	37	CASH	CASH	Pharm	50950.00
22762	37	CASH	CASH	Front(Eveng)	15570.00
22763	37	ICICI	CREDIT CARD	OPD(Eveng)	5304.00
22764	37	ICICI	UPI	IPD(eveng)	3300.00
22765	37	ICICI	UPI	OPD(Eveng)	15138.00
22766	37	OTHERS	UPI	Razorpay(OPD -EVENG)	5500.00
22767	37	ICICI	UPI	OPD(Eveng)	950.00
22768	37	ICICI	UPI	Injection	28118.00
22769	37	ICICI	DEBIT CARD	Injection	2335.00
24436	39	CASH	CASH	Medicine Sales	408.00
24437	39	ICICI	UPI	Medicine Sales	1313.00
24438	39	CASH	CASH	Canteen	1020.00
24439	39	ICICI	UPI	Canteen	650.00
24440	39	CASH	CASH	Front Night	36080.00
24441	39	CASH	CASH	Front Morning	26930.00
24442	39	ICICI	UPI	Front Morning	161680.00
24443	39	CASH	CASH	Parking	140.00
24444	39	CASH	CASH	Cash Return	170.00
24445	39	CASH	CASH	Pharmacy	20300.00
24446	39	ICICI	UPI	Pharmacy	35435.00
24447	39	ICICI	UPI	OPD Injection	24150.00
24448	39	CASH	CASH	Coffee Shop	1700.00
24449	39	ICICI	UPI	Coffee Shop	940.00
24450	39	CASH	CASH	Front Evening	79180.00
24451	39	ICICI	UPI	Front Evening	110781.00
24484	40	CASH	CASH	Canteen	1440.00
24485	40	ICICI	UPI	Canteen	820.00
24486	40	CASH	CASH	Front(Night)	4200.00
\.


--
-- Data for Name: daily_pharmacy_income; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_pharmacy_income (id, report_id, ot_ward_total, acme_new_total, parking, coffee_shop, canteen_income, credit_card_charges_night, training_fee, humankind_sales, misc_income) FROM stdin;
\.


--
-- Data for Name: daily_service_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_service_lines (id, report_id, service_id, rate, quantity, amount, is_night_entry, narration) FROM stdin;
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
28862	25	43	0.00	3	70000.00	f	\N
1079	2	1	0.00	2	45000.00	f	\N
28863	25	1	0.00	2	23000.00	f	\N
28864	25	7	0.00	1	1560.00	f	\N
28865	25	8	0.00	1	1865.00	f	\N
28866	25	44	0.00	4	91400.00	f	\N
28867	25	33	0.00	5	74100.00	f	\N
28868	25	65	0.00	1	22188.00	f	\N
28869	25	39	12000.00	1	12000.00	f	\N
28870	25	12	0.00	1	960.00	f	\N
28871	25	4	600.00	13	7800.00	f	\N
28872	25	2	450.00	15	6750.00	f	\N
28873	25	10	0.00	1	55040.00	f	\N
28874	25	41	0.00	1	1070.00	f	\N
28875	25	14	0.00	1	6100.00	f	\N
28876	25	5	700.00	5	3500.00	f	\N
28877	25	6	700.00	1	700.00	f	\N
28878	25	37	1000.00	1	1000.00	f	\N
28879	25	16	1200.00	1	1200.00	f	\N
28880	25	53	1600.00	1	1600.00	f	\N
28881	25	42	0.00	1	4000.00	t	IVF-ET Patient Observation
28882	25	11	0.00	1	2085.00	t	for Dt.27/07/2026
28883	25	2	450.00	1	450.00	t	\N
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
13360	15	1	0.00	2	60000.00	f	\N
13361	15	7	0.00	1	3270.00	f	\N
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
13362	15	8	0.00	1	2040.00	f	\N
13363	15	59	0.00	1	200.00	f	\N
13364	15	64	17000.00	1	17000.00	f	\N
13365	15	44	0.00	1	25400.00	f	\N
13366	15	29	5000.00	1	5000.00	f	\N
13367	15	26	1000.00	2	2000.00	f	\N
13368	15	65	0.00	1	21800.00	f	\N
13369	15	21	600.00	1	600.00	f	\N
13370	15	25	10000.00	3	30000.00	f	\N
13371	15	11	0.00	1	2469.00	f	\N
13372	15	31	0.00	1	4300.00	f	\N
13373	15	3	550.00	4	2200.00	f	\N
13374	15	4	600.00	10	6000.00	f	\N
13375	15	2	450.00	26	11700.00	f	\N
13376	15	9	0.00	1	200.00	f	\N
13377	15	10	0.00	1	73203.00	f	\N
13378	15	41	0.00	1	9936.00	f	\N
13379	15	14	0.00	2	30655.00	f	Semen Fructose(satyam)\n
13380	15	5	700.00	7	4900.00	f	\N
13381	15	6	700.00	3	2100.00	f	\N
13382	15	16	1200.00	2	2400.00	f	\N
13383	15	47	700.00	1	700.00	f	\N
13384	15	63	20000.00	1	20000.00	f	\N
13385	15	42	0.00	2	94000.00	t	\N
13386	15	46	0.00	1	2480.00	t	\N
13387	15	45	0.00	2	14800.00	t	\N
20859	19	1	0.00	1	40000.00	f	\N
20860	19	7	0.00	1	3330.00	f	\N
20861	19	8	0.00	1	1095.00	f	\N
20862	19	59	0.00	1	12.00	f	\N
20863	19	33	0.00	5	75540.00	f	\N
20864	19	20	9000.00	1	9000.00	f	\N
20865	19	13	600.00	1	600.00	f	\N
20866	19	26	1000.00	1	1000.00	f	\N
20867	19	65	0.00	1	35704.00	f	\N
20868	19	21	600.00	2	1200.00	f	\N
20869	19	54	3500.00	2	7000.00	f	\N
20870	19	66	500.00	1	500.00	f	\N
10616	10	1	0.00	2	41000.00	f	\N
10617	10	7	0.00	1	2300.00	f	\N
10618	10	8	0.00	1	2180.00	f	\N
10619	10	59	0.00	1	700.00	f	\N
10620	10	44	0.00	9	137700.00	f	\N
10621	10	20	9000.00	2	18000.00	f	\N
10622	10	19	2000.00	1	2000.00	f	\N
10623	10	38	0.00	2	300000.00	f	\N
10624	10	58	12000.00	1	12000.00	f	\N
10625	10	11	0.00	1	210.00	f	\N
10626	10	3	550.00	7	3850.00	f	\N
10627	10	4	600.00	5	3000.00	f	\N
10628	10	2	450.00	23	10350.00	f	\N
10629	10	15	0.00	1	27564.00	f	\N
10630	10	9	0.00	1	300.00	f	\N
10631	10	10	0.00	1	84359.00	f	\N
10632	10	22	500.00	2	1000.00	f	\N
10633	10	41	0.00	1	1070.00	f	\N
10634	10	14	0.00	1	19510.00	f	\N
13388	15	49	0.00	1	2500.00	t	\N
13389	15	22	500.00	1	500.00	t	\N
13390	15	62	0.00	2	24000.00	t	\N
13391	15	50	0.00	1	3470.00	t	\N
31963	27	7	0.00	1	2660.00	f	\N
31964	27	8	0.00	1	1915.00	f	\N
31965	27	59	0.00	1	1224.00	f	\N
31966	27	44	0.00	7	126100.00	f	\N
31967	27	33	0.00	1	8500.00	f	\N
31968	27	19	2000.00	2	4000.00	f	\N
21348	20	10	0.00	1	62142.00	f	\N
21349	20	14	0.00	1	52370.00	f	\N
21350	20	18	1100.00	1	1100.00	f	\N
21351	20	5	700.00	2	1400.00	f	\N
21352	20	6	700.00	3	2100.00	f	\N
21353	20	16	1200.00	3	3600.00	f	\N
21354	20	47	700.00	1	700.00	f	\N
21355	20	17	1200.00	2	2400.00	f	\N
21356	20	104	0.00	1	4050.00	f	\N
21357	20	55	1200.00	1	1200.00	f	\N
21358	20	9	0.00	1	280.00	f	\N
21359	20	\N	0.00	1	0.00	f	\N
21360	20	42	0.00	4	43400.00	t	\N
21361	20	29	5000.00	1	5000.00	t	\N
21362	20	3	550.00	1	550.00	t	\N
31969	27	65	0.00	1	16754.00	f	\N
31970	27	21	600.00	2	1200.00	f	\N
31971	27	38	0.00	1	50000.00	f	IVF-1
31972	27	100	500.00	1	500.00	f	\N
31973	27	66	500.00	1	500.00	f	\N
31974	27	4	600.00	8	4800.00	f	\N
31975	27	101	600.00	5	3000.00	f	\N
31976	27	2	450.00	48	21600.00	f	\N
31977	27	30	400.00	2	800.00	f	\N
31978	27	9	0.00	1	280.00	f	\N
31979	27	10	0.00	1	72576.00	f	\N
31980	27	41	0.00	1	31860.00	f	\N
31981	27	14	0.00	1	17490.00	f	\N
31982	27	5	700.00	8	5600.00	f	\N
31983	27	6	700.00	3	2100.00	f	\N
31984	27	16	1200.00	6	7200.00	f	\N
31985	27	47	700.00	1	700.00	f	\N
28884	25	110	600.00	1	600.00	t	\N
31986	27	17	1200.00	3	3600.00	f	\N
31987	27	42	0.00	4	83200.00	t	\N
31988	27	45	0.00	2	13100.00	t	\N
31989	27	48	500.00	1	500.00	t	\N
31990	27	50	0.00	1	1260.00	t	\N
20871	19	11	0.00	1	190.00	f	\N
20872	19	4	600.00	9	5400.00	f	\N
20873	19	55	1200.00	2	2400.00	f	\N
20874	19	2	450.00	22	9900.00	f	\N
20875	19	9	0.00	1	200.00	f	\N
16891	13	7	0.00	1	2655.00	f	\N
16892	13	8	0.00	1	1500.00	f	\N
16893	13	44	0.00	5	128300.00	f	\N
16894	13	29	5000.00	1	5000.00	f	\N
16895	13	20	9000.00	1	9000.00	f	\N
16896	13	26	1000.00	1	1000.00	f	\N
16897	13	19	2000.00	1	2000.00	f	\N
16898	13	54	3500.00	1	3500.00	f	\N
20876	19	10	0.00	1	60909.00	f	\N
20877	19	14	0.00	1	24335.00	f	\N
20878	19	5	700.00	7	4900.00	f	\N
20879	19	16	1200.00	2	2400.00	f	\N
20880	19	53	1600.00	1	1600.00	f	\N
20881	19	42	0.00	3	46000.00	t	\N
16899	13	31	0.00	1	5000.00	f	\N
16900	13	3	550.00	3	1650.00	f	\N
16901	13	4	600.00	6	3600.00	f	\N
16902	13	55	1200.00	1	1200.00	f	\N
16903	13	2	450.00	18	8100.00	f	\N
16904	13	30	400.00	4	1600.00	f	\N
16905	13	9	0.00	1	200.00	f	\N
16906	13	10	0.00	1	53348.00	f	\N
16907	13	52	1100.00	1	1100.00	f	\N
16908	13	41	0.00	1	29256.00	f	\N
16909	13	5	700.00	4	2800.00	f	\N
16910	13	6	700.00	3	2100.00	f	\N
16911	13	16	1200.00	2	2400.00	f	\N
20882	19	45	0.00	1	4300.00	t	\N
20883	19	11	0.00	1	2366.00	t	\N
20884	19	101	600.00	2	1200.00	t	\N
20885	19	2	450.00	2	900.00	t	\N
10635	10	18	1100.00	1	1100.00	f	\N
10636	10	5	700.00	6	4200.00	f	\N
10637	10	16	1200.00	4	4800.00	f	\N
10638	10	53	1600.00	1	1600.00	f	\N
10639	10	17	1200.00	1	1200.00	f	\N
10640	10	42	0.00	1	35000.00	t	\N
10641	10	45	0.00	1	30200.00	t	\N
10642	10	20	9000.00	1	9000.00	t	\N
10643	10	21	600.00	1	600.00	t	\N
10644	10	11	0.00	1	209.00	t	\N
10645	10	31	0.00	1	1000.00	t	\N
10646	10	4	600.00	1	600.00	t	\N
10647	10	2	450.00	2	900.00	t	\N
10648	10	50	0.00	1	2200.00	t	\N
10649	10	6	700.00	1	700.00	t	\N
10650	10	16	1200.00	1	1200.00	t	\N
11173	11	43	0.00	3	125000.00	f	\N
11174	11	1	0.00	2	22000.00	f	\N
11175	11	7	0.00	1	1800.00	f	\N
11176	11	8	0.00	1	2620.00	f	\N
11177	11	59	0.00	1	90.00	f	\N
11178	11	44	0.00	1	4500.00	f	\N
11179	11	35	300.00	1	300.00	f	\N
11180	11	26	1000.00	1	1000.00	f	\N
11181	11	19	2000.00	1	2000.00	f	\N
11182	11	21	600.00	1	600.00	f	\N
11183	11	38	0.00	1	2000.00	f	Semen freezing 1months\n
11184	11	11	0.00	1	4514.00	f	\N
11185	11	31	0.00	1	1000.00	f	\N
11186	11	3	550.00	8	4400.00	f	\N
11187	11	4	600.00	5	3000.00	f	\N
11188	11	2	450.00	35	15750.00	f	\N
11189	11	15	0.00	1	14974.00	f	\N
11190	11	30	0.00	1	540.00	f	RPD Dental\n
11191	11	9	0.00	1	170.00	f	\N
11192	11	10	0.00	1	46660.00	f	\N
11193	11	41	0.00	1	55190.00	f	\N
11194	11	14	0.00	1	850.00	f	\N
11195	11	5	700.00	7	4900.00	f	\N
11196	11	6	700.00	5	3500.00	f	\N
11197	11	16	1200.00	5	6000.00	f	\N
11198	11	47	700.00	2	1400.00	f	\N
11199	11	42	0.00	1	30000.00	t	\N
11200	11	13	600.00	2	1200.00	t	\N
11201	11	50	0.00	1	260.00	t	\N
11994	14	3	550.00	3	1650.00	f	\N
11995	14	4	600.00	1	600.00	f	\N
11996	14	2	450.00	19	8550.00	f	\N
11997	14	5	700.00	2	1400.00	f	\N
11998	14	6	700.00	1	700.00	f	\N
11999	14	16	1200.00	2	2400.00	f	\N
12000	14	26	1000.00	2	2000.00	f	\N
12001	14	29	5000.00	1	5000.00	f	\N
12002	14	21	600.00	1	600.00	f	\N
12003	14	10	0.00	1	49290.00	f	\N
12004	14	15	0.00	1	27194.00	f	\N
12005	14	49	0.00	1	93664.00	f	\N
12006	14	31	0.00	1	1000.00	f	\N
12007	14	14	0.00	1	14730.00	f	\N
12008	14	9	0.00	1	300.00	f	\N
12009	14	8	0.00	1	2535.00	f	\N
12010	14	7	0.00	1	3080.00	f	\N
12011	14	59	0.00	1	894.00	f	\N
12012	14	1	0.00	2	7000.00	f	\N
12013	14	44	0.00	3	98000.00	f	\N
12014	14	38	0.00	1	68000.00	f	Dolly Laishram (IVF-1 & ICSI)\n
12015	14	\N	0.00	1	0.00	f	\N
12016	14	42	0.00	1	40000.00	t	\N
12017	14	50	0.00	1	220.00	t	\N
16912	13	66	500.00	1	500.00	f	\N
16913	13	65	0.00	1	24669.00	f	\N
16914	13	42	0.00	2	52000.00	t	\N
16508	17	1	0.00	2	4000.00	f	\N
16509	17	7	0.00	1	2585.00	f	\N
16510	17	8	0.00	1	2480.00	f	\N
16511	17	59	0.00	1	9.00	f	\N
16512	17	102	11000.00	1	11000.00	f	\N
16513	17	44	0.00	7	146700.00	f	\N
16514	17	26	1000.00	1	1000.00	f	\N
16515	17	65	0.00	1	39964.00	f	\N
16516	17	21	600.00	2	1200.00	f	\N
16517	17	38	0.00	1	150000.00	f	\N
41755	35	43	0.00	2	4000.00	f	\N
41756	35	1	0.00	1	4000.00	f	IVF Observation
41757	35	7	0.00	1	2820.00	f	\N
41758	35	8	0.00	1	2390.00	f	\N
41759	35	114	25000.00	1	25000.00	f	\N
41760	35	64	17000.00	1	17000.00	f	\N
41761	35	26	1000.00	1	1000.00	f	\N
41762	35	65	0.00	1	42480.00	f	\N
16518	17	11	0.00	1	1320.00	f	\N
16519	17	31	0.00	1	4000.00	f	\N
16520	17	3	550.00	1	550.00	f	\N
16521	17	4	600.00	5	3000.00	f	\N
16522	17	2	450.00	37	16650.00	f	\N
16523	17	9	0.00	1	280.00	f	\N
16524	17	10	0.00	1	76173.00	f	\N
16525	17	41	0.00	1	38200.00	f	\N
16526	17	18	1100.00	2	2200.00	f	\N
16527	17	5	700.00	6	4200.00	f	\N
16528	17	6	700.00	5	3500.00	f	\N
16529	17	16	1200.00	1	1200.00	f	\N
16530	17	17	1200.00	2	2400.00	f	\N
16531	17	42	0.00	2	90000.00	t	\N
16532	17	45	0.00	1	1100.00	t	\N
16533	17	13	600.00	1	600.00	t	\N
16534	17	22	500.00	1	500.00	t	\N
41763	35	21	600.00	3	1800.00	f	\N
41764	35	38	0.00	1	55000.00	f	\N
41765	35	11	0.00	1	2340.00	f	\N
41766	35	101	600.00	13	7800.00	f	\N
41767	35	112	500.00	39	19500.00	f	\N
41768	35	9	0.00	1	50.00	f	\N
23618	21	43	0.00	1	50000.00	f	\N
23619	21	1	0.00	1	1000.00	f	\N
23620	21	7	0.00	1	1850.00	f	\N
23621	21	8	0.00	1	2545.00	f	\N
23622	21	59	0.00	1	764.00	f	\N
23623	21	44	0.00	1	38200.00	f	\N
23624	21	33	0.00	1	7700.00	f	\N
23625	21	105	0.00	1	15000.00	f	\N
23626	21	13	600.00	1	600.00	f	\N
23627	21	26	1000.00	2	2000.00	f	\N
23628	21	19	2000.00	1	2000.00	f	\N
23629	21	65	0.00	1	28102.00	f	\N
23630	21	39	12000.00	1	12000.00	f	\N
23631	21	106	0.00	1	18000.00	f	\N
23632	21	11	0.00	1	5977.00	f	\N
23633	21	4	600.00	7	4200.00	f	\N
23634	21	2	450.00	25	11250.00	f	\N
23635	21	9	0.00	1	250.00	f	\N
23636	21	10	0.00	1	83546.00	f	\N
23637	21	41	0.00	1	4170.00	f	\N
41769	35	10	0.00	1	49376.00	f	\N
41770	35	41	0.00	1	15730.00	f	\N
41771	35	14	0.00	1	32680.00	f	\N
41772	35	113	2160.00	1	2160.00	f	\N
41773	35	5	700.00	6	4200.00	f	\N
41774	35	6	700.00	1	700.00	f	\N
41775	35	16	1200.00	4	4800.00	f	\N
41776	35	47	700.00	2	1400.00	f	\N
41777	35	42	0.00	1	1200.00	t	\N
41778	35	50	0.00	1	360.00	t	\N
24796	22	1	0.00	2	4080.00	f	B/O Rajkumari Sanjubala & L. Daina Kom
24797	22	7	0.00	1	2370.00	f	\N
24798	22	26	1000.00	2	2000.00	f	\N
24799	22	38	0.00	2	246200.00	f	Bimola Rai & Takhelmayum Romita
24800	22	4	600.00	9	5400.00	f	\N
24801	22	2	450.00	29	13050.00	f	\N
24802	22	14	0.00	1	5820.00	f	\N
24803	22	18	1100.00	1	1100.00	f	\N
24804	22	107	3000.00	1	3000.00	f	\N
24805	22	16	1200.00	2	2400.00	f	\N
24806	22	47	700.00	3	2100.00	f	\N
24807	22	5	700.00	4	2800.00	f	\N
24808	22	9	0.00	1	250.00	f	\N
24809	22	8	0.00	1	2410.00	f	\N
24810	22	10	0.00	1	40327.00	f	\N
24811	22	99	1200.00	1	1200.00	f	\N
24812	22	66	500.00	1	500.00	f	\N
24813	22	31	0.00	1	2000.00	f	\N
24814	22	41	0.00	1	3050.00	f	\N
24815	22	43	0.00	3	150000.00	f	\N
24816	22	44	0.00	3	104060.00	f	\N
24817	22	65	0.00	1	23572.00	f	\N
24818	22	42	0.00	2	90000.00	t	\N
24819	22	46	0.00	1	1220.00	t	By Somo
24820	22	22	500.00	1	500.00	t	\N
35069	29	43	0.00	1	2000.00	f	\N
35070	29	1	0.00	2	42000.00	f	\N
35071	29	7	0.00	1	1560.00	f	\N
35072	29	8	0.00	1	1540.00	f	\N
35073	29	59	0.00	3	944.00	f	\N
35074	29	44	0.00	5	141300.00	f	\N
21425	12	43	0.00	1	2000.00	f	\N
21426	12	1	0.00	2	42000.00	f	\N
21427	12	7	0.00	1	2160.00	f	\N
21428	12	8	0.00	1	1720.00	f	\N
21429	12	44	0.00	3	137000.00	f	\N
21430	12	33	0.00	1	13300.00	f	\N
21431	12	29	5000.00	1	5000.00	f	\N
21432	12	26	1000.00	1	1000.00	f	\N
21433	12	19	2000.00	1	2000.00	f	\N
21434	12	65	0.00	1	36588.00	f	\N
21435	12	21	600.00	3	1800.00	f	\N
21436	12	38	0.00	1	260000.00	f	\N
21437	12	54	3500.00	1	3500.00	f	\N
21438	12	3	550.00	4	2200.00	f	\N
21439	12	4	600.00	5	3000.00	f	\N
21440	12	101	600.00	3	1800.00	f	\N
21441	12	55	1200.00	1	1200.00	f	\N
21442	12	2	450.00	46	20700.00	f	\N
21443	12	30	400.00	1	400.00	f	\N
21444	12	9	0.00	1	300.00	f	\N
21445	12	10	0.00	1	87045.00	f	\N
21446	12	103	50.00	1	50.00	f	\N
21447	12	60	0.00	1	377.00	f	\N
21448	12	14	0.00	2	31655.00	f	\N
21449	12	5	700.00	5	3500.00	f	\N
21450	12	6	700.00	5	3500.00	f	\N
21451	12	16	1200.00	8	9600.00	f	\N
21452	12	47	700.00	1	700.00	f	\N
21453	12	17	1200.00	2	2400.00	f	\N
21454	12	42	0.00	1	2000.00	t	\N
21455	12	2	450.00	1	450.00	t	\N
35075	29	29	5000.00	1	5000.00	f	\N
35076	29	26	1000.00	1	1000.00	f	\N
35077	29	65	0.00	1	48892.00	f	\N
35078	29	21	600.00	1	600.00	f	\N
35079	29	12	0.00	1	4690.00	f	\N
35080	29	25	10000.00	1	10000.00	f	\N
35081	29	4	600.00	10	6000.00	f	\N
35082	29	2	450.00	31	13950.00	f	\N
35083	29	9	0.00	1	60.00	f	\N
35084	29	10	0.00	1	57929.00	f	\N
35085	29	41	0.00	1	1700.00	f	\N
35086	29	14	0.00	1	21860.00	f	\N
35087	29	5	700.00	2	1400.00	f	\N
35088	29	6	700.00	3	2100.00	f	\N
35089	29	37	1000.00	1	1000.00	f	\N
35090	29	42	0.00	2	12000.00	t	\N
35091	29	50	0.00	1	1550.00	t	\N
23638	21	14	0.00	1	29050.00	f	\N
23639	21	5	700.00	4	2800.00	f	\N
23640	21	6	700.00	1	700.00	f	\N
23641	21	16	1200.00	1	1200.00	f	\N
23642	21	17	1200.00	1	1200.00	f	\N
23643	21	42	0.00	2	25000.00	t	\N
23644	21	46	0.00	1	40.00	t	Coffe Shop Marketing 
23645	21	13	600.00	3	1800.00	t	\N
23646	21	2	450.00	1	450.00	t	\N
23647	21	50	0.00	1	2920.00	t	\N
37900	32	7	0.00	1	2010.00	f	\N
37901	32	46	0.00	1	1050.00	f	ACON Cotton cloths Purchase (1500-1050=450)
37902	32	8	0.00	1	840.00	f	\N
37903	32	26	1000.00	1	1000.00	f	\N
37904	32	65	0.00	1	30890.00	f	\N
37905	32	54	3500.00	1	3500.00	f	\N
30147	26	1	0.00	1	48000.00	f	\N
30148	26	59	0.00	1	240.00	f	\N
30149	26	33	0.00	1	4570.00	f	\N
30150	26	29	5000.00	1	5000.00	f	\N
30151	26	13	600.00	1	600.00	f	\N
30152	26	26	1000.00	2	2000.00	f	\N
30153	26	39	12000.00	1	12000.00	f	\N
30154	26	38	0.00	1	100000.00	f	\N
30155	26	31	0.00	1	2000.00	f	\N
30156	26	4	600.00	10	6000.00	f	\N
30157	26	55	1200.00	1	1200.00	f	\N
30158	26	2	450.00	41	18450.00	f	\N
30159	26	14	0.00	1	27728.00	f	\N
30160	26	5	700.00	4	2800.00	f	\N
30161	26	16	1200.00	4	4800.00	f	\N
30162	26	17	1200.00	2	2400.00	f	\N
37906	32	101	600.00	3	1800.00	f	\N
37907	32	55	1200.00	1	1200.00	f	\N
37908	32	112	500.00	10	5000.00	f	\N
37909	32	10	0.00	1	27623.00	f	\N
37910	32	14	0.00	1	5020.00	f	\N
37911	32	5	700.00	2	1400.00	f	\N
37912	32	45	0.00	3	53500.00	t	\N
37913	32	50	0.00	1	750.00	t	\N
27622	24	4	600.00	5	3000.00	f	\N
27623	24	2	450.00	30	13500.00	f	\N
27624	24	5	700.00	5	3500.00	f	\N
27625	24	6	700.00	2	1400.00	f	\N
27626	24	16	1200.00	8	9600.00	f	\N
27627	24	47	700.00	1	700.00	f	\N
27628	24	101	600.00	3	1800.00	f	\N
27629	24	53	1600.00	1	1600.00	f	\N
27630	24	26	1000.00	2	2000.00	f	\N
27631	24	21	600.00	2	1200.00	f	\N
27632	24	64	17000.00	1	17000.00	f	\N
27633	24	29	5000.00	1	5000.00	f	\N
27634	24	100	500.00	1	500.00	f	\N
27635	24	14	0.00	1	15020.00	f	\N
27636	24	1	0.00	4	39000.00	f	\N
27637	24	38	0.00	1	310000.00	f	\N
27638	24	31	0.00	1	5300.00	f	1.Histopathological (Large) Change to Histopathologiacal Cancer Complex-Rs.1800
27639	24	7	0.00	1	5410.00	f	\N
27640	24	9	0.00	1	230.00	f	\N
25773	23	7	0.00	1	1975.00	f	\N
25774	23	44	0.00	1	13300.00	f	\N
25775	23	33	0.00	1	190.00	f	IVF ET-Patient
25776	23	4	600.00	5	3000.00	f	\N
25777	23	2	450.00	29	13050.00	f	\N
25778	23	30	400.00	2	800.00	f	\N
25779	23	9	0.00	1	280.00	f	\N
25780	23	10	0.00	1	53024.00	f	\N
25781	23	41	0.00	1	840.00	f	\N
25782	23	14	0.00	1	22810.00	f	\N
25783	23	5	700.00	4	2800.00	f	\N
25784	23	6	700.00	2	1400.00	f	\N
25785	23	16	1200.00	3	3600.00	f	\N
25786	23	47	700.00	1	700.00	f	\N
25787	23	109	250.00	1	250.00	f	\N
25788	23	65	0.00	1	21284.00	f	\N
25789	23	8	0.00	1	2390.00	f	\N
25790	23	42	0.00	2	80000.00	t	\N
25791	23	13	600.00	1	600.00	t	\N
25792	23	2	450.00	2	900.00	t	\N
25793	23	50	0.00	1	7120.00	t	\N
25794	23	5	700.00	1	700.00	t	\N
36003	30	7	0.00	1	1840.00	f	\N
36004	30	8	0.00	1	1200.00	f	\N
36005	30	44	0.00	3	35300.00	f	\N
36006	30	33	0.00	1	2570.00	f	\N
36007	30	26	1000.00	2	2000.00	f	\N
36008	30	65	0.00	1	29140.00	f	\N
36009	30	101	600.00	3	1800.00	f	\N
36010	30	2	450.00	14	6300.00	f	\N
24089	18	43	0.00	2	4450.00	f	\N
24090	18	7	0.00	1	2050.00	f	\N
24091	18	8	0.00	1	1880.00	f	\N
24092	18	33	0.00	2	4800.00	f	\N
24093	18	26	1000.00	1	1000.00	f	\N
24094	18	65	0.00	1	44033.00	f	\N
24095	18	100	500.00	1	500.00	f	\N
24096	18	31	0.00	1	2000.00	f	\N
24097	18	3	550.00	1	550.00	f	\N
24098	18	4	600.00	6	3600.00	f	\N
24099	18	101	600.00	8	4800.00	f	\N
24100	18	2	450.00	22	9900.00	f	\N
24101	18	30	400.00	1	400.00	f	\N
24102	18	9	0.00	1	200.00	f	\N
24103	18	10	0.00	1	53959.00	f	\N
24104	18	22	500.00	1	500.00	f	\N
24105	18	14	0.00	1	32013.00	f	\N
24106	18	99	1200.00	1	1200.00	f	\N
24107	18	5	700.00	6	4200.00	f	\N
24108	18	6	700.00	2	1400.00	f	\N
24109	18	16	1200.00	4	4800.00	f	\N
24110	18	17	1200.00	1	1200.00	f	\N
24111	18	42	0.00	1	2000.00	t	\N
24112	18	45	0.00	1	3300.00	t	\N
24113	18	62	0.00	2	55000.00	t	\N
36011	30	9	0.00	1	40.00	f	\N
36012	30	10	0.00	1	23090.00	f	\N
36013	30	41	0.00	1	10098.00	f	\N
36014	30	14	0.00	1	20762.00	f	\N
36015	30	6	700.00	2	1400.00	f	\N
36016	30	47	700.00	1	700.00	f	\N
36017	30	17	1200.00	1	1200.00	f	\N
36018	30	42	0.00	1	1000.00	t	\N
36019	30	101	600.00	2	1200.00	t	\N
36020	30	2	450.00	1	450.00	t	\N
36021	30	62	0.00	1	45000.00	t	\N
36022	30	50	0.00	1	220.00	t	\N
40428	34	43	0.00	1	10000.00	f	\N
40429	34	1	0.00	1	2000.00	f	\N
40430	34	7	0.00	1	2560.00	f	\N
40431	34	8	0.00	1	980.00	f	\N
40432	34	44	0.00	2	7000.00	f	\N
40433	34	65	0.00	1	22780.00	f	\N
27641	24	8	0.00	1	1280.00	f	\N
27642	24	65	0.00	1	15514.00	f	\N
27643	24	12	0.00	1	14700.00	f	\N
27644	24	10	0.00	1	67567.00	f	\N
27645	24	11	0.00	1	2385.00	f	\N
27646	24	41	0.00	1	8670.00	f	\N
27647	24	66	500.00	1	500.00	f	\N
27648	24	43	0.00	1	40000.00	f	\N
27649	24	44	0.00	6	125000.00	f	\N
27650	24	42	0.00	1	54000.00	t	\N
27651	24	23	300.00	1	300.00	t	\N
27652	24	54	0.00	1	350.00	t	Remaining amount paymeent (Rs.3150(Cash)-350(UPI)
27653	24	2	450.00	1	450.00	t	\N
27654	24	50	0.00	1	2530.00	t	\N
40434	34	21	600.00	1	600.00	f	\N
40435	34	38	0.00	1	10000.00	f	Embryo Freezing 1 Month
40436	34	101	600.00	3	1800.00	f	\N
40437	34	112	500.00	15	7500.00	f	\N
40438	34	10	0.00	1	27420.00	f	\N
40439	34	14	0.00	1	11410.00	f	\N
40440	34	5	700.00	2	1400.00	f	\N
40441	34	6	700.00	1	700.00	f	\N
40442	34	37	1000.00	1	1000.00	f	\N
40443	34	16	1200.00	1	1200.00	f	\N
40444	34	21	600.00	1	600.00	t	\N
30163	26	6	700.00	1	700.00	f	\N
21333	20	1	0.00	1	20000.00	f	\N
21334	20	7	0.00	1	3050.00	f	\N
21335	20	8	0.00	1	1670.00	f	\N
21336	20	102	11000.00	1	11000.00	f	\N
21337	20	33	0.00	5	61080.00	f	\N
21338	20	35	300.00	1	300.00	f	\N
21339	20	20	9000.00	1	9000.00	f	\N
21340	20	49	0.00	1	52230.00	f	\N
21341	20	65	0.00	1	35288.00	f	IVF INJECTION 14290
21342	20	21	600.00	1	600.00	f	\N
21343	20	54	3500.00	1	3500.00	f	\N
21344	20	11	0.00	2	1325.00	f	\N
21345	20	3	550.00	1	550.00	f	\N
21346	20	4	600.00	10	6000.00	f	\N
21347	20	2	450.00	33	14850.00	f	\N
30164	26	8	0.00	1	1815.00	f	\N
30165	26	49	0.00	1	59525.00	f	\N
30166	26	9	0.00	1	300.00	f	\N
30167	26	10	0.00	1	85097.00	f	\N
30168	26	21	600.00	1	600.00	f	\N
30169	26	106	0.00	1	3500.00	f	\N
30170	26	41	0.00	1	5190.00	f	\N
30171	26	43	0.00	1	40000.00	f	\N
30172	26	44	0.00	3	103550.00	f	\N
30173	26	65	0.00	1	41954.00	f	\N
30174	26	42	0.00	3	7000.00	t	\N
30175	26	50	0.00	1	220.00	t	\N
40445	34	112	500.00	1	500.00	t	\N
40446	34	50	0.00	1	4720.00	t	\N
39622	33	1	0.00	3	34000.00	f	\N
39623	33	7	0.00	1	1630.00	f	\N
39624	33	8	0.00	1	1855.00	f	\N
39625	33	59	0.00	1	118.00	f	\N
39626	33	33	0.00	2	14000.00	f	\N
39627	33	29	5000.00	1	5000.00	f	\N
39628	33	26	1000.00	2	2000.00	f	\N
39629	33	49	0.00	1	81808.00	f	\N
39630	33	65	0.00	1	37470.00	f	\N
39631	33	21	600.00	1	600.00	f	\N
39632	33	38	0.00	1	25000.00	f	\N
39633	33	54	3500.00	1	3500.00	f	\N
39634	33	4	600.00	5	3000.00	f	\N
39635	33	55	1200.00	1	1200.00	f	\N
39636	33	112	500.00	23	11500.00	f	\N
39637	33	9	0.00	1	150.00	f	\N
39638	33	10	0.00	1	37444.00	f	\N
39639	33	14	0.00	1	8340.00	f	\N
39640	33	6	700.00	3	2100.00	f	\N
39641	33	16	1200.00	1	1200.00	f	\N
39642	33	\N	0.00	1	0.00	f	\N
43129	36	43	0.00	1	40000.00	f	\N
43130	36	1	0.00	1	2000.00	f	\N
43131	36	116	500.00	1	500.00	f	\N
43132	36	7	0.00	1	3860.00	f	\N
43133	36	8	0.00	1	2700.00	f	\N
43134	36	59	0.00	1	264.00	f	\N
43135	36	64	17000.00	1	17000.00	f	\N
43136	36	44	0.00	3	69500.00	f	\N
43137	36	33	0.00	2	28850.00	f	\N
43138	36	35	300.00	1	300.00	f	\N
43139	36	65	0.00	1	12685.00	f	\N
43140	36	12	0.00	1	5060.00	f	Yesterday
43141	36	54	3500.00	1	3500.00	f	\N
43142	36	11	0.00	1	2320.00	f	\N
43143	36	31	0.00	1	3500.00	f	Medium biposy-1500,\nLarge Biopsy-2000
43144	36	101	600.00	5	3000.00	f	\N
43145	36	55	1200.00	1	1200.00	f	\N
43146	36	112	500.00	34	17000.00	f	\N
43147	36	9	0.00	1	100.00	f	\N
43148	36	10	0.00	1	45601.00	f	\N
43149	36	22	500.00	1	500.00	f	\N
43150	36	41	0.00	1	7620.00	f	\N
43151	36	14	0.00	1	7420.00	f	\N
43152	36	115	700.00	2	1400.00	f	\N
43153	36	5	700.00	4	2800.00	f	\N
43154	36	6	700.00	4	2800.00	f	\N
43155	36	16	1200.00	2	2400.00	f	\N
43156	36	42	0.00	4	11200.00	t	\N
33788	28	1	0.00	1	2000.00	f	\N
33789	28	7	0.00	1	2040.00	f	\N
33790	28	111	500.00	1	500.00	f	\N
33791	28	8	0.00	1	1660.00	f	\N
33792	28	44	0.00	1	36000.00	f	\N
33793	28	33	0.00	2	83400.00	f	\N
33794	28	26	1000.00	1	1000.00	f	\N
33795	28	65	0.00	1	13586.00	f	\N
33796	28	21	600.00	1	600.00	f	\N
33797	28	28	4000.00	1	4000.00	f	\N
33798	28	54	3500.00	1	3500.00	f	\N
33799	28	4	600.00	12	7200.00	f	\N
33800	28	101	600.00	7	4200.00	f	\N
33801	28	55	1200.00	1	1200.00	f	\N
33802	28	2	450.00	32	14400.00	f	\N
33803	28	30	400.00	1	400.00	f	\N
33804	28	9	0.00	1	130.00	f	\N
33805	28	10	0.00	1	83561.00	f	\N
33806	28	41	0.00	1	11740.00	f	\N
33807	28	14	0.00	1	28910.00	f	\N
33808	28	5	700.00	11	7700.00	f	\N
33809	28	6	700.00	3	2100.00	f	\N
33810	28	16	1200.00	1	1200.00	f	\N
33811	28	47	700.00	5	3500.00	f	\N
33812	28	42	0.00	3	81680.00	t	\N
33813	28	45	0.00	1	3300.00	t	\N
33814	28	4	600.00	1	600.00	t	\N
33815	28	101	600.00	1	600.00	t	\N
33816	28	22	500.00	1	500.00	t	\N
33817	28	50	0.00	1	220.00	t	\N
44265	37	1	0.00	1	30000.00	f	\N
44266	37	7	0.00	1	2920.00	f	\N
44267	37	8	0.00	1	1065.00	f	\N
44268	37	59	0.00	1	104.00	f	\N
44269	37	64	17000.00	1	17000.00	f	\N
44270	37	44	0.00	1	3300.00	f	\N
37107	31	1	0.00	2	4000.00	f	\N
37108	31	7	0.00	1	2370.00	f	\N
37109	31	8	0.00	1	1255.00	f	\N
37110	31	59	0.00	2	256.00	f	\N
37111	31	44	0.00	4	63200.00	f	\N
37112	31	35	300.00	1	300.00	f	\N
37113	31	65	0.00	1	42068.00	f	\N
37114	31	21	600.00	1	600.00	f	\N
37115	31	39	12000.00	3	36000.00	f	\N
37116	31	38	0.00	1	150000.00	f	\N
37117	31	25	10000.00	1	10000.00	f	\N
37118	31	4	600.00	3	1800.00	f	\N
37119	31	101	600.00	2	1200.00	f	\N
37120	31	2	450.00	21	9450.00	f	\N
37121	31	30	400.00	1	400.00	f	\N
37122	31	9	0.00	1	50.00	f	\N
37123	31	10	0.00	1	42492.00	f	\N
37124	31	41	0.00	1	4650.00	f	\N
37125	31	14	0.00	1	7925.00	f	\N
37126	31	5	700.00	1	700.00	f	\N
37127	31	6	700.00	2	1400.00	f	\N
37128	31	47	700.00	2	1400.00	f	\N
37129	31	45	0.00	1	11500.00	t	\N
44271	37	33	0.00	3	14660.00	f	\N
44272	37	26	1000.00	1	1000.00	f	\N
44273	37	65	0.00	1	30453.00	f	\N
44274	37	21	600.00	1	600.00	f	\N
44275	37	28	4000.00	2	8000.00	f	\N
44276	37	11	0.00	1	2412.00	f	\N
44277	37	101	600.00	11	6600.00	f	\N
44278	37	112	500.00	46	23000.00	f	\N
44279	37	30	400.00	1	400.00	f	\N
44280	37	9	0.00	1	150.00	f	\N
44281	37	10	0.00	1	95230.00	f	\N
44282	37	41	0.00	1	16658.00	f	\N
44283	37	14	0.00	1	21990.00	f	\N
44284	37	5	700.00	4	2800.00	f	\N
44285	37	6	700.00	1	700.00	f	\N
44286	37	16	1200.00	8	9600.00	f	\N
44287	37	42	0.00	1	40000.00	t	\N
44288	37	45	0.00	2	8500.00	t	\N
44289	37	100	500.00	1	500.00	t	\N
46021	38	1	0.00	1	5000.00	f	\N
46022	38	7	0.00	1	2730.00	f	\N
46023	38	8	0.00	1	2440.00	f	\N
46024	38	102	11000.00	1	11000.00	f	\N
46025	38	44	0.00	1	64900.00	f	\N
46026	38	65	0.00	1	14445.00	f	\N
46027	38	38	0.00	1	80000.00	f	ET-70000\nEMBRYO FREEZING 1 Month-10000
46028	38	28	4000.00	1	4000.00	f	\N
46029	38	11	0.00	1	1300.00	f	\N
46030	38	31	0.00	1	2250.00	f	\N
46031	38	101	600.00	9	5400.00	f	\N
46032	38	112	500.00	37	18500.00	f	\N
46033	38	30	400.00	1	400.00	f	\N
46034	38	9	0.00	1	150.00	f	\N
46035	38	10	0.00	1	66528.00	f	\N
46036	38	41	0.00	1	29710.00	f	\N
46037	38	14	0.00	1	10230.00	f	\N
46038	38	113	2160.00	1	2160.00	f	\N
46039	38	108	1100.00	1	1100.00	f	\N
46040	38	5	700.00	4	2800.00	f	\N
46041	38	6	700.00	4	2800.00	f	\N
46042	38	16	1200.00	6	7200.00	f	\N
46043	38	51	700.00	1	700.00	f	\N
46044	38	42	0.00	3	7200.00	t	\N
46045	38	13	600.00	1	600.00	t	\N
46046	38	101	600.00	1	600.00	t	\N
46047	38	112	500.00	1	500.00	t	\N
46048	38	50	0.00	1	8620.00	t	\N
47442	39	43	0.00	2	35000.00	f	Nongthombam Sanathoi & Rahoiliu
47443	39	117	0.00	1	4000.00	f	\N
47444	39	7	0.00	1	1670.00	f	\N
47445	39	8	0.00	1	2640.00	f	\N
47446	39	59	0.00	1	681.00	f	\N
47447	39	102	11000.00	1	11000.00	f	\N
47448	39	44	0.00	6	150300.00	f	Piyainu, Endrea, Riya & Baby, Linthoingambi & Baby, Michelle & Baby & Rubina
47449	39	35	300.00	1	300.00	f	\N
47450	39	20	9000.00	2	18000.00	f	\N
47451	39	65	0.00	1	24150.00	f	\N
47452	39	38	0.00	1	75000.00	f	Laishram Bony
47453	39	106	0.00	1	10000.00	f	\N
47454	39	11	0.00	3	1721.00	f	\N
47455	39	101	600.00	10	6000.00	f	\N
47456	39	112	500.00	29	14500.00	f	\N
47457	39	30	400.00	1	400.00	f	\N
47458	39	9	0.00	1	140.00	f	\N
47459	39	10	0.00	1	55735.00	f	\N
47460	39	22	500.00	2	1000.00	f	\N
47461	39	41	0.00	1	22680.00	f	\N
47462	39	14	0.00	1	15680.00	f	\N
47463	39	108	1100.00	1	1100.00	f	\N
47464	39	5	700.00	5	3500.00	f	\N
47465	39	6	700.00	4	2800.00	f	\N
47466	39	16	1200.00	2	2400.00	f	\N
47467	39	53	1600.00	1	1600.00	f	\N
47468	39	51	700.00	1	700.00	f	\N
47469	39	47	700.00	3	2100.00	f	\N
47470	39	42	0.00	1	20000.00	t	\N
47471	39	42	0.00	1	15000.00	t	Re-advance
47472	39	46	0.00	1	170.00	t	Somo for Canteen Marketing
47473	39	16	1200.00	1	1200.00	t	\N
47547	40	7	0.00	1	2260.00	f	\N
47548	40	101	600.00	12	7200.00	f	\N
47549	40	112	500.00	33	16500.00	f	\N
47550	40	118	500.00	1	500.00	f	\N
47551	40	5	700.00	4	2800.00	f	\N
47552	40	16	1200.00	2	2400.00	f	\N
47553	40	17	1200.00	1	1200.00	f	\N
47554	40	54	3500.00	1	3500.00	f	\N
47555	40	55	1200.00	1	1200.00	f	\N
47556	40	102	11000.00	1	11000.00	f	\N
47557	40	108	1100.00	1	1100.00	f	\N
47558	40	21	600.00	2	1200.00	f	\N
47559	40	42	0.00	1	2000.00	t	\N
47560	40	50	0.00	1	2200.00	t	\N
\.


--
-- Data for Name: daily_staff_advances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_staff_advances (id, report_id, staff_id, staff_name, amount) FROM stdin;
79	30	\N		0.00
\.


--
-- Data for Name: department_leaders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.department_leaders (id, department_id, head_staff_id, subhead_staff_id, created_at, updated_at) FROM stdin;
1	6	2	\N	2026-07-14 11:47:51.275771	2026-07-14 11:47:51.275771
36	19	16	\N	2026-08-01 11:38:37.634912	2026-08-01 11:38:37.634912
38	18	\N	\N	2026-08-02 06:06:40.235081	2026-08-02 06:06:40.235081
39	9	\N	\N	2026-08-02 06:06:45.336142	2026-08-02 06:06:45.336142
35	22	\N	\N	2026-07-18 05:36:11.2332	2026-07-18 05:36:11.2332
42	14	\N	\N	2026-08-02 06:07:27.402006	2026-08-02 06:07:27.402006
44	23	\N	\N	2026-08-08 12:06:25.30387	2026-08-08 12:06:25.30387
37	15	52	\N	2026-08-02 06:06:33.586283	2026-08-02 06:06:33.586283
45	17	14	\N	2026-08-08 12:07:33.820273	2026-08-08 12:07:33.820273
40	8	29	\N	2026-08-02 06:07:04.579565	2026-08-02 06:07:04.579565
34	21	7	\N	2026-07-15 06:54:29.520461	2026-07-15 06:54:29.520461
41	3	17	71	2026-08-02 06:07:15.249995	2026-08-02 06:07:15.249995
43	20	21	\N	2026-08-02 06:07:33.240501	2026-08-02 06:07:33.240501
46	24	\N	\N	2026-08-20 05:41:35.272008	2026-08-20 05:41:35.272008
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.departments (id, name, floor, head, active, created_at, updated_at, is_clinical) FROM stdin;
1	Operations	1st Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	f
2	Management	1st Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	f
4	Housekeeping	Any Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	f
5	MTS	Any Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	f
7	Front Office 	Ground Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	f
10	Dispensary 	Ground Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	f
11	Purchase and Store	Ground Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	f
12	Canteen 	Ground Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	f
13	RMO	Any floor 		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	f
16	Administrative 	1st Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	f
6	Accounts	1st Floor	Ngangkham Tarunkumar Singh	t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	f
19	OT	1st Floor	Ningthoujam Dhanapyari	t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	t
18	Asthetic 	2nd Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	t
9	CSSD	1st Floor		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	t
22	ICU/HDU	2nd Floor		t	2026-07-18 05:36:11.164643	2026-07-18 05:36:11.164643	t
14	Radiology 	3rd floor 		t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	t
23	Laboratory	Ground Floor		t	2026-08-08 12:06:25.274599	2026-08-08 12:06:25.274599	f
15	Assisted Reproductive Technology (ART)	2nd Floor 	Kangjam Sangeeta Devi 	t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	t
17	Human Resources 	1st Floor	Guruaribam Rohit Kumar Sharma	t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	f
8	NICU	Second Floor 	Maibam Sanatombi Chanu	t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	t
21	Nursing Central	1st Floor	Thounaojam Sorojini Chanu	t	2026-07-15 06:54:29.442996	2026-07-15 06:54:29.442996	t
3	OPD	Ground Floor	Beishamayum Niliza Devi	t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	t
20	Ward	2nd Floor	Tourangbam Anita Devi	t	2026-07-14 09:14:46.720646	2026-07-14 09:14:46.720646	t
24	ACON	Building 2		t	2026-08-20 05:41:35.250311	2026-08-20 05:41:35.250311	f
\.


--
-- Data for Name: designations; Type: TABLE DATA; Schema: public; Owner: -
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
44	Office Assistant 	t	2026-08-19 10:13:49.380265	2026-08-19 10:13:49.380265
45	Housekeeping Staff	t	2026-08-19 10:14:11.90117	2026-08-19 10:14:11.90117
\.


--
-- Data for Name: encounters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.encounters (id, appointment_id, symptoms, diagnosis, vitals, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: expense_catalog; Type: TABLE DATA; Schema: public; Owner: -
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
46	DAILY_COLLECTION	KEISHAMTHONG ( GOLDEN ) RS15,000*1	0.00	0	t	2026-08-03 07:35:30.986321	2026-08-03 07:35:30.986321
47	ACON	ELECTRIC RECHARGE	0.00	0	t	2026-08-22 12:03:45.636991	2026-08-22 12:03:45.636991
\.


--
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: -
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
38	CONSUMABLES_ITEMS	CONSUMABLES ITEMS	50	t	2026-07-31 07:23:11.065269	2026-07-31 07:23:11.065269
39	MEDICINES_ITEMS	MEDICINES ITEMS	51	t	2026-07-31 07:23:38.341013	2026-07-31 07:23:38.341013
40	DIESEL	DIESEL	52	t	2026-08-02 09:49:27.687635	2026-08-02 09:49:27.687635
41	SOLID_WASTE	SOLID WASTE	53	t	2026-08-02 09:59:08.11536	2026-08-02 09:59:08.11536
42	NEWSPAPER_&_JOURNAL	NEWSPAPER & JOURNAL	54	t	2026-08-02 11:02:58.179582	2026-08-02 11:02:58.179582
43	HUMANKIND_EXPENSES	HUMANKIND EXPENSES	55	t	2026-08-07 05:24:03.420267	2026-08-07 05:24:03.420267
44	ACME-LABOUR_EXPENSE	ACME-LABOUR EXPENSE	56	t	2026-08-07 11:16:43.146458	2026-08-07 11:16:43.146458
45	LEGAL_&_LICENSE	LEGAL & LICENSE	57	t	2026-08-13 11:09:09.411781	2026-08-13 11:09:09.411781
46	ADVERTISING_&_PROMOTION	ADVERTISING  &  PROMOTION	58	t	2026-08-17 11:45:44.324853	2026-08-17 11:45:44.324853
47	UTENSIL	UTENSIL	59	t	2026-08-17 12:10:28.81243	2026-08-17 12:10:28.81243
48	SECURITY_MESS	SECURITY MESS	60	t	2026-08-20 10:14:28.510111	2026-08-20 10:14:28.510111
49	GAS_EXPENSES	GAS EXPENSES	61	t	2026-08-21 10:47:44.794121	2026-08-21 10:47:44.794121
\.


--
-- Data for Name: grn_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.grn_items (id, grn_id, po_item_id, item_id, item_name, received_qty, free_qty, unit_rate, gst_percent, line_value, batch, expiry_date, notes, sale_price, batch_id, unit_id) FROM stdin;
\.


--
-- Data for Name: grns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.grns (id, po_id, vendor_id, no_po_reason, grn_no, grn_date, date_of_delivery, remarks, status, created_by, created_at, store_id) FROM stdin;
\.


--
-- Data for Name: immunization_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.immunization_records (id, patient_id, schedule_id, vaccine_code, vaccine_name, dose_label, administered_at, administered_by_staff_id, batch_no, manufacturer, site, route, adverse_event, notes, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: immunization_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.immunization_schedules (id, vaccine_code, vaccine_name, dose_label, beneficiary_type, due_age_days, due_age_label, max_age_days, dose_amount, route, site, applies_in, source, notes, active, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_items (id, sku, name, category, unit, quantity, reorder_level, supplier, location, expiry_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: item_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.item_types (id, name, description, created_at, updated_at) FROM stdin;
1	Pharmaceuticals	\N	2026-08-23 09:47:42.178232	2026-08-23 09:47:42.178232
\.


--
-- Data for Name: item_unit_prices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.item_unit_prices (id, item_id, cost_price, sale_price, conversion_factor, is_default, created_at, updated_at, unit_id) FROM stdin;
\.


--
-- Data for Name: items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.items (id, name, item_type_id, rate, gst_percent, created_at, updated_at, sale_price, hsn_code, barcode, reorder_level, reorder_qty, drug_schedule, storage_condition, tax_category, is_narcotic, allow_fractional, base_unit_id, purchase_unit_id, sale_unit_id) FROM stdin;
1	Test Medicine 1787478462184	1	50.00	12.00	2026-08-23 09:47:42.186505	2026-08-23 16:33:44.631	100.00	\N	\N	109.000	50.000	OTC	Room Temperature	taxable	f	f	3	3	3
\.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leave_requests (id, request_no, staff_id, leave_type, is_half_day, start_date, end_date, reason, status, reviewed_at, reviewer_note, forwarded_to_staff_id, approver_ids, supporting_document, created_at, updated_at) FROM stdin;
5	LV-N8F81	57	Casual Leave	t	2026-08-02 18:30:00	2026-08-02 18:30:00	Ushop	Approved	2026-08-06 09:20:03.675	ok	\N	[]	\N	2026-08-04 04:49:28.032545	2026-08-04 04:49:28.032545
3	LV-L0JWA	57	Loss of Pay	f	2026-07-23 18:30:00	2026-07-23 18:30:00	Too much road work in vicinity of home	Approved	2026-08-06 09:20:12.392	ok	\N	[]	\N	2026-07-29 09:44:19.446847	2026-07-29 09:44:19.446847
2	LV-B9EXM	57	Casual Leave	t	2026-07-21 18:30:00	2026-07-21 18:30:00	Ushop ama yaojabagine	Approved	2026-08-06 09:20:19.967	ok	\N	[]	\N	2026-07-22 10:40:32.087275	2026-07-22 10:40:32.087275
1	LV-TLGO8	3	Loss of Pay	t	2026-07-15 18:30:00	2026-07-15 18:30:00	Personal	Approved	2026-08-06 09:20:27.34	ok	\N	[2]	\N	2026-07-15 11:20:06.208218	2026-07-15 11:20:06.208218
4	LV-O2H4B	16	Casual Leave	t	2026-07-31 18:30:00	2026-07-31 18:30:00	trial	Cancelled	2026-08-14 04:26:55.381	Cancelled	\N	[]	\N	2026-08-01 06:06:57.512769	2026-08-01 06:06:57.512769
6	LV-9S9Y2	16	Casual Leave	t	2026-08-17 18:00:00	2026-08-17 18:00:00	ppp	Pending	\N	\N	\N	[]	\N	2026-08-17 06:46:57.173514	2026-08-17 06:46:57.173514
7	LV-5P7A9	57	Casual Leave	f	2026-08-13 18:30:00	2026-08-13 18:30:00	personal work	Pending	\N	\N	\N	[]	\N	2026-08-17 12:22:46.679977	2026-08-17 12:22:46.679977
\.


--
-- Data for Name: leave_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leave_types (id, name, max_days, active, payable, payment_rate, created_at, updated_at) FROM stdin;
1	Casual Leave	7	t	t	100.00	2026-07-14 09:14:46.623674	2026-07-14 09:14:46.623674
2	Sick Leave	5	t	t	100.00	2026-07-14 09:14:46.623674	2026-07-14 09:14:46.623674
3	Maternity Leave	180	t	t	50.00	2026-07-14 09:14:46.623674	2026-07-14 09:14:46.623674
4	Paternity Leave	10	t	t	50.00	2026-07-14 09:14:46.623674	2026-07-14 09:14:46.623674
5	Loss of Pay	365	t	f	0.00	2026-07-14 09:14:46.623674	2026-07-14 09:14:46.623674
\.


--
-- Data for Name: management_approvers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.management_approvers (id, staff_id, active, created_at, updated_at) FROM stdin;
1	59	t	2026-08-02 08:18:13.984467	2026-08-02 08:18:13.984467
2	58	t	2026-08-02 08:18:18.092688	2026-08-02 08:18:18.092688
\.


--
-- Data for Name: medicines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medicines (id, sku, name, generic_name, form, strength, stock, reorder_level, price, batch_no, expiry_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, sender_id, receiver_id, channel_type, department_id, content, read_at, created_at) FROM stdin;
1	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	organization	\N	dtrtrt	\N	2026-08-01 05:51:36.867913
3	56i2G5jlvvQ2xnyB2At4NLBaZGE8GRzM	\N	department	19	Good morning team	\N	2026-08-01 06:07:59.217756
4	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	\N	department	17	Good morning	\N	2026-08-01 06:12:09.852173
5	56i2G5jlvvQ2xnyB2At4NLBaZGE8GRzM	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	direct	\N	hh	2026-08-19 07:19:09.714168	2026-08-17 06:42:10.93419
2	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	direct	\N	erer	2026-08-19 07:19:14.263404	2026-08-01 05:52:00.078503
\.


--
-- Data for Name: monthly_bank_expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.monthly_bank_expenses (id, month, category, label, vendor_id, amount, payment_mode, payment_date, cheque_issue_date, reference_no, bank_name, narration, is_recurring, is_salary_auto, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, title, message, type, link, read, created_at, updated_at) FROM stdin;
2	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	New Shift Schedule	You have been assigned a new shift starting from 2026-06-01 to 2026-06-30.	info	/hr/roster	f	2026-07-16 05:26:39.625684	2026-07-16 05:26:39.625684
5	4jkPcSiE1XLo8XjDPon3LlNzhvgC5cls	New Leave Request	Subhashchandra Konjengbam requested leave: LV-L0JWA (Loss of Pay)	info	/hr/leaves	f	2026-07-29 09:44:19.486531	2026-07-29 09:44:19.486531
7	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	New Shift Schedule	You have been assigned a new shift starting from 2026-07-29 to 2026-07-29.	info	/hr/roster	f	2026-07-29 10:59:34.654878	2026-07-29 10:59:34.654878
8	4jkPcSiE1XLo8XjDPon3LlNzhvgC5cls	New Leave Request	Ningthoujam Dhanapyari requested leave: LV-O2H4B (Casual Leave)	info	/hr/leaves	f	2026-08-01 06:06:57.532897	2026-08-01 06:06:57.532897
13	bvVcAKHJBjjzrlj1eNFpBfkeVdJCmFbJ	New Shift Schedule	You have been assigned to a shift on 2026-08-01.	info	/hr/roster	f	2026-08-01 11:39:56.864327	2026-08-01 11:39:56.864327
14	4RlM0XEcby4dd3l5LcsTzWvqqXWLGiX8	New Shift Schedule	You have been assigned to a shift on 2026-08-01.	info	/hr/roster	f	2026-08-01 11:40:10.406739	2026-08-01 11:40:10.406739
15	bvVcAKHJBjjzrlj1eNFpBfkeVdJCmFbJ	New Shift Schedule	You have been assigned to a shift on 2026-08-03.	info	/hr/roster	f	2026-08-01 11:40:31.248935	2026-08-01 11:40:31.248935
16	bvVcAKHJBjjzrlj1eNFpBfkeVdJCmFbJ	New Shift Schedule	You have been assigned to a shift on 2026-08-06.	info	/hr/roster	f	2026-08-01 11:40:37.771925	2026-08-01 11:40:37.771925
17	bvVcAKHJBjjzrlj1eNFpBfkeVdJCmFbJ	New Shift Schedule	You have been assigned to a shift on 2026-08-07.	info	/hr/roster	f	2026-08-01 11:40:40.463404	2026-08-01 11:40:40.463404
18	4RlM0XEcby4dd3l5LcsTzWvqqXWLGiX8	New Shift Schedule	You have been assigned to a shift on 2026-08-07.	info	/hr/roster	f	2026-08-01 11:46:03.689732	2026-08-01 11:46:03.689732
19	4RlM0XEcby4dd3l5LcsTzWvqqXWLGiX8	New Shift Schedule	You have been assigned to a shift on 2026-08-08.	info	/hr/roster	f	2026-08-01 11:46:08.770883	2026-08-01 11:46:08.770883
20	4RlM0XEcby4dd3l5LcsTzWvqqXWLGiX8	New Shift Schedule	You have been assigned to a shift on 2026-08-09.	info	/hr/roster	f	2026-08-01 11:46:10.561472	2026-08-01 11:46:10.561472
23	bvVcAKHJBjjzrlj1eNFpBfkeVdJCmFbJ	New Shift Schedule	You have been assigned to a shift on 2026-08-05.	info	/hr/roster	f	2026-08-02 05:17:11.650202	2026-08-02 05:17:11.650202
25	4jkPcSiE1XLo8XjDPon3LlNzhvgC5cls	New Leave Request	Subhashchandra Konjengbam requested leave: LV-N8F81 (Casual Leave)	info	/hr/leaves	f	2026-08-04 04:49:28.065705	2026-08-04 04:49:28.065705
29	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	Leave Approved	Your leave request LV-TLGO8 has been fully approved.	success	/hr/leaves	f	2026-08-06 09:20:27.362441	2026-08-06 09:20:27.362441
24	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	New Leave Request	Subhashchandra Konjengbam requested leave: LV-N8F81 (Casual Leave)	info	/hr/leaves	t	2026-08-04 04:49:28.056036	2026-08-04 04:49:28.056036
26	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	Leave Approved	Your leave request LV-N8F81 has been fully approved.	success	/hr/leaves	t	2026-08-06 09:20:03.721054	2026-08-06 09:20:03.721054
27	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	Leave Approved	Your leave request LV-L0JWA has been fully approved.	success	/hr/leaves	t	2026-08-06 09:20:12.44361	2026-08-06 09:20:12.44361
28	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	Leave Approved	Your leave request LV-B9EXM has been fully approved.	success	/hr/leaves	t	2026-08-06 09:20:19.995772	2026-08-06 09:20:19.995772
11	56i2G5jlvvQ2xnyB2At4NLBaZGE8GRzM	New Shift Schedule	You have been assigned to a shift on 2026-08-01.	info	/hr/roster	t	2026-08-01 11:39:40.834636	2026-08-01 11:39:40.834636
12	56i2G5jlvvQ2xnyB2At4NLBaZGE8GRzM	New Shift Schedule	You have been assigned to a shift on 2026-08-02.	info	/hr/roster	t	2026-08-01 11:39:49.731639	2026-08-01 11:39:49.731639
21	56i2G5jlvvQ2xnyB2At4NLBaZGE8GRzM	New Shift Schedule	You have been assigned to a shift on 2026-08-03.	info	/hr/roster	t	2026-08-02 05:17:08.126823	2026-08-02 05:17:08.126823
22	56i2G5jlvvQ2xnyB2At4NLBaZGE8GRzM	New Shift Schedule	You have been assigned to a shift on 2026-08-05.	info	/hr/roster	t	2026-08-02 05:17:09.504146	2026-08-02 05:17:09.504146
30	WuL6qppGqTBJqO5De6CP1pmELvTrkewo	New Shift Schedule	You have been assigned to a shift on 2026-08-01.	info	/hr/roster	f	2026-08-17 06:43:10.798536	2026-08-17 06:43:10.798536
31	CDrlnxvl0gz2iI92SVPG3r24lbmKuQDj	New Shift Schedule	You have been assigned to a shift on 2026-08-01.	info	/hr/roster	f	2026-08-17 06:43:14.986983	2026-08-17 06:43:14.986983
32	4RlM0XEcby4dd3l5LcsTzWvqqXWLGiX8	New Shift Schedule	You have been assigned to a shift on 2026-08-01.	info	/hr/roster	f	2026-08-17 06:43:18.450851	2026-08-17 06:43:18.450851
34	4jkPcSiE1XLo8XjDPon3LlNzhvgC5cls	New Leave Request	Ningthoujam Dhanapyari requested leave: LV-9S9Y2 (Casual Leave)	info	/hr/leaves	f	2026-08-17 06:46:57.209533	2026-08-17 06:46:57.209533
36	4jkPcSiE1XLo8XjDPon3LlNzhvgC5cls	New Leave Request	Subhashchandra Konjengbam requested leave: LV-5P7A9 (Casual Leave)	info	/hr/leaves	f	2026-08-17 12:22:46.722549	2026-08-17 12:22:46.722549
\.


--
-- Data for Name: nursing_academic_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_academic_schedules (id, batch_id, academic_year, semester, start_date, end_date, fee_due_date, fee_due_offset_days, remarks, created_at, updated_at) FROM stdin;
1	3	2026-2027	1	2026-09-17	2027-01-20	2026-10-02	15	\N	2026-08-20 06:41:32.776206	2026-08-20 06:41:32.776206
\.


--
-- Data for Name: nursing_applicants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_applicants (id, application_no, course_id, academic_year, name, email, phone, gender, dob, address, entrance_merit_score, quota_category, status, notes, seat_booking_amount, seat_booking_status, seat_booking_receipt_no, seat_booking_date, seat_booking_payment_mode, seat_booking_notes, created_at, updated_at, aadhar_no, father_name, father_phone, father_aadhar_no, father_occupation, father_organization, father_annual_income, mother_name, mother_phone, mother_aadhar_no, mother_occupation, mother_organization, mother_annual_income, present_address, present_district, present_pincode, present_state, permanent_address, permanent_district, permanent_pincode, permanent_state, academic_history, referrer_id, referral_amount, referral_comments, father_deceased, mother_deceased, has_guardian, guardian_name, guardian_relation, guardian_phone, guardian_aadhar_no, guardian_occupation, guardian_organization, guardian_annual_income) FROM stdin;
3	NUR-APP-2026-R30FR	1	2026-2027	CHANGKAMLIU GANGMEI	changkuamlugangmei@gmail.com	9233170687	Female	2008-12-12	THARON THANGMEIBAND	38.00	general	pending	\N	0.00	none	\N	\N	\N	\N	2026-08-20 06:39:25.662677	2026-08-20 06:39:25.662677	257355840941	KAJEIGAI GANGMEI	8798549049	000000000000	FARMER	\N	90000.00	SUNITA GANGMEI	8798549049	000000000000	\N	\N	90000.00	THARON THANGMEIBAND	IMPHAL WEST	795001	MANIPUR	KHOUPUM	NONEY	795147	MANIPUR	[{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "7.00", "instituteName": "KHANGSILLUNG HR. SEC. SCHOOL", "subjectScores": "", "instituteAddress": "KHOUPUM"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "COHSEM", "subjects": "ENGLISH\\nALTERNATIVE ENGLISH\\nPHYSICS\\nCHEMISTRY\\nBIOLOGY", "percentage": "51", "instituteName": "IBOTONSANA GIRL'S HIGHER SECONDARY SCHOOL", "subjectScores": "52\\n36\\n53\\n52\\n62", "instituteAddress": "IMPHAL"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N
5	NUR-APP-2026-EXE4X	1	2026-2027	MOSOKHO ALEOTEMEI		8798023370	Male	2004-07-04	RABUNNAMAI	47.00	reserved	pending	\N	0.00	none	\N	\N	\N	\N	2026-08-20 08:38:56.301533	2026-08-20 08:38:56.301533	495096443298	ASHULI ASOSII	8798023370	000000000000	\N	\N	60000.00	ATHILI KOMUNI	8798023370	000000000000	\N	\N	0.00	RABUNNAMAI	SENAPATI	795150	MANIPUR	RABUNNAMAI	SENAPATI	795150	MANIPUR	[{"exam": "10th", "year": "2020", "board": "BOSEM", "subjects": "", "percentage": "76.2", "instituteName": "OKAI ACADEMY", "subjectScores": "", "instituteAddress": "MAO"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2022", "board": "COHSEM", "subjects": "ENGLISH\\nALTERNATIVE ENGLISH\\nPHYSICS\\nBIOLOGY\\nCHEMISTRY", "percentage": "66", "instituteName": "HUMAN RESOURCE DEVELOPMENT ACADEMY", "subjectScores": "80\\n80\\n51\\n67\\n52", "instituteAddress": "GHARI"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N
6	NUR-APP-2026-X8LZ3	1	2026-2027	LISON AYEKPAM	gaminglison@gmail.con	6009462257	Male	2008-03-11	KHURAI CHINGANGBAM LEIKAI TINSEED ROAD	43.00	reserved	pending	\N	0.00	none	\N	\N	\N	\N	2026-08-20 08:48:20.439771	2026-08-20 08:51:12.31	447936129901	AYEKPAM MILANJIT SINGH	9366238089	000000000000	\N	\N	0.00	NINGOMBAM SHAYA DEVI	6009462257	000000000000	\N	\N	0.00	KHURAI CHINGANGBAM LEIKAI TINSEED ROAD	IMPHAL EAST	795010	MANIPUR	KHURAI CHINGANGBAM LEIKAI TINSEED ROAD	IMPHAL EAST	795010	MANIPUR	[{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "7.67", "instituteName": "FRIENDSHIP EDUCATIONAL ACADEMY", "subjectScores": "", "instituteAddress": "KHURAI"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "COHSEM", "subjects": "ENG\\nMIL\\nBIO\\nCHE\\nPHY", "percentage": "61", "instituteName": "DIVINE HISHER SECONDARI SCHOOL", "subjectScores": "53\\n47\\n75\\n76\\n54", "instituteAddress": "GHARI AWANG LEIKAI"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N
7	NUR-APP-2026-OMXDN	1	2026-2027	NARENDRA KHUMUKCHAM	narendrakhumukcham389@gmail.com	8974425668	Male	2008-03-04	AWANGKHUNOU MAYAI LEIKAI	43.00	reserved	pending	\N	0.00	none	\N	\N	\N	\N	2026-08-20 09:23:07.683489	2026-08-20 09:23:07.683489	273328130014	KHUMUKCHAM NABACHANDRA	9436020682	000000000000	GOVERMENT EMPLOYEE	HEALTH DEPARTMENT	542556.00	SENJAM ROMAPATI DEVI	8415826118	000000000000	GOVERMENT EMPLOYEE	HELATH DEPARTMENT	0.00	AWANGKHUNOU MAYAI LEIKAI	IMPHAL WEST	795113	MANIPUR	AWANGKHUNOU MAYAI LEIKAI	IMPHAL WEST	795113	MANIPUR	[{"exam": "10th", "year": "2023", "board": "CBSE", "subjects": "", "percentage": "", "instituteName": "UNACCO SCHOOL EXCELLENCE IN EDUCATION", "subjectScores": "", "instituteAddress": "IMPHAL"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2025", "board": "CBSE", "subjects": "ENG CORE\\nHOME SC\\nCHE\\nBIO\\nPAINTING\\nPHY", "percentage": "", "instituteName": "UNACCO SCHOOL EXCELLENCE IN EDUCATION", "subjectScores": "D1\\nB2\\nD2\\nD2\\nB2\\nC2", "instituteAddress": "IMPHAL"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N
8	NUR-APP-2026-VPSK6	1	2026-2027	YUMNAM ARBINDA	yumnamarbinda@gmail.com	9362324683	Male	2008-03-31	WAHENG KHUMAN MAYAI LEIKAI	41.00	reserved	pending	\N	0.00	none	\N	\N	\N	\N	2026-08-21 07:52:53.526723	2026-08-21 07:52:53.526723	861051247670	YUMNAM BASANTA SINGH	9678222390	000000000000	GOVT EMPLOYEE(CENTRAL)	\N	0.00	YUMNAM CHAOBA DEVI	9862168136	000000000000	HOUSEWIFE	\N	0.00	WAHENG KHUMAN MAYAI LEIKAI	BISHNUPUR	795134	MANIPUR	WAHENG KHUMAN MAYAI LEIKAI	BISHNUPUR	795134	MANIPUR	[{"exam": "10th", "year": "2023", "board": "BOSEM", "subjects": "", "percentage": "70.5", "instituteName": "CAREER GUIDANCE AND COUNSELLING CENTRE", "subjectScores": "", "instituteAddress": "WANGOI"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2025", "board": "CBSE", "subjects": "ENG CORE\\nMIL\\nPHY\\nBIO\\nCHE\\nPHYSICAL EDUCATION", "percentage": "", "instituteName": "UNACCO SCHOOL EXCELLENCE IN EDUCATION", "subjectScores": "A2\\nB1\\nD1\\nD2\\nC1\\nC1", "instituteAddress": "IMPHAL"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N
9	NUR-APP-2026-WOY2H	1	2026-2027	SHOIBAM PHILISIA DEVI		8258095206	Female	2008-10-15	THOUBAL ACHOUBA	38.00	reserved	pending	\N	0.00	none	\N	\N	\N	\N	2026-08-21 08:00:17.713433	2026-08-21 08:00:17.713433	227142243575	SHOIBAM SURAJ SINGH	0000000000	000000000000	\N	\N	0.00	SH. (O) MINAKSHI DEVI	0000000000	000000000000	WEAVER	\N	90000.00	THOUBAL ACHOUBA	THOUBAL	795138	MANIPUR	THOUBAL ACHOUBA	THOUBAL	795138	MANIPUR	[{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "8.33", "instituteName": "EVERGREEN FLOWER'S SCHOOL", "subjectScores": "", "instituteAddress": "THOUBAL"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "COHSEM", "subjects": "ENG\\nMIL\\nPHY\\nCHE\\nBIO", "percentage": "57.4", "instituteName": "COMET SCHOOL", "subjectScores": "34\\n45\\n72\\n64\\n72", "instituteAddress": "CHANGANGEI UCHECKON"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N
10	NUR-APP-2026-DBYPN	1	2026-2027	TANIA CHONGTHAM	indirach059@gmail.com	8787892098	Female	2007-11-05	THONGJU PART II PECHU LAMPAK	25.00	reserved	pending	\N	0.00	none	\N	\N	\N	\N	2026-08-21 08:08:37.266005	2026-08-21 08:08:37.266005	400850621084	CHONGTHAM SURAJ SINGH	8837380300	000000000000	BUSINESS	\N	95000.00	CHONGTHAM INDIRA DEVI	9856269131	000000000000	HOUSEWIFE	\N	0.00	THONGJU PART II PECHU LAMPAK	IMPHAL EAST	795003	MANIPUR	THONGJU PART II PECHU LAMPAK	IMPHAL EAST	795003	MANIPUR	[{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "6.50", "instituteName": "STANDARD ROBARTH HR. SEC. SCHOOL", "subjectScores": "", "instituteAddress": "CANCHIPUR"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "COHSEM", "subjects": "ENG\\nMIL\\nPHY\\nCHE \\nBIO\\nHUMA ECOLOGY AND FAMILY ACIENCES", "percentage": "58", "instituteName": "INTERNATIONAL SCHOOL OF RESOURCES", "subjectScores": "61\\n41\\n65\\n53\\n52\\n70", "instituteAddress": "CANCHIPUR"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N
11	NUR-APP-2026-KIP4E	1	2026-2027	MAIBAM MANGANLEIMA DEVI		7005881351	Female	2009-01-10	SAGOLBAND KHAMNAM LEIRAK	32.00	reserved	pending	\N	0.00	none	\N	\N	\N	\N	2026-08-21 08:16:33.141364	2026-08-21 08:16:33.141364	826549643363	MAIBAM AMITABACHAN	7005881351	000000000000	TEACHER	PRIVATE SCHOOL	90000.00	MAIBAM SUNITA	9615705716	000000000000	HOUSEWIFE	\N	0.00	SAGOLBAND KHAMNAM LEIRAK	IMPHAL WEST	795001	MANIPUR	SAGOLBAND KHAMNAM LEIRAK	IMPHAL WEST	795001	MANIPUR	[{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "6.33", "instituteName": "PITAMBARA ENGLISH SCHOOL", "subjectScores": "", "instituteAddress": "KWAKEITHEL"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "COHSEM", "subjects": "ENG\\nMIL\\nPHY\\nBIO\\nCHE\\nTHANG TA", "percentage": "64.4%", "instituteName": "DELTA ADVANCE SCHOOL", "subjectScores": "53\\n45\\n62\\n86\\n60\\n76", "instituteAddress": "KWAKEITHEL"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N
12	NUR-APP-2026-8DPMT	1	2026-2027	DEVIYA AKHONGBAM		9436295484	Female	2009-03-28	SINGJAMEI WANGMA PEBIYA PANDIT LEIKAI	25.00	reserved	pending	\N	0.00	none	\N	\N	\N	\N	2026-08-21 08:23:30.925658	2026-08-21 08:23:30.925658	410250374314	AKHONGBAM DEVENDRO SINGH	0000000000	000000000000	FARMER	\N	80000.00	NAOREM KHEMABATI DEVI	0000000000	000000000000	HOUSEWIFE	\N	0.00	SINGJAMEI WANGMA PEBIYA PANDIT LEIKAI	IMPHAL EAST	795008	MANIPUR	SINGJAMEI WANGMA PEBIYA PANDIT LEIKAI	IMPHAL EAST	795008	MANIPUR	[{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "7.67%", "instituteName": "BLOSSOM SCHOOL", "subjectScores": "", "instituteAddress": "CHANGANGEI"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "COHSEM", "subjects": "ENG\\nMIL\\nPHY\\nCHE\\nBIO\\nHEALTH AND PGYSICAL EDUCATION", "percentage": "69%", "instituteName": "MILLENIUM INSTITUTE OF SCIENCES", "subjectScores": "55\\n55\\n71\\n64\\n64\\n100", "instituteAddress": "SAGOLBAND, KWAKEITHEL MAYAIKOIBI"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N
2	NUR-APP-2026-8N51G	1	2026-2027	NGAORAI BUNGSONG		8798502476	Male	2007-09-25	CHANDEL CHRISTAIN	38.00	reserved	converted		60000.00	unadjusted	RCP-ADV-2026-XPCTP	2026-07-02	upi		2026-08-20 06:20:08.319823	2026-08-21 08:39:39.46	354602203740	(L) BS ROLLY ANAL	0000000000	000000000000	\N	\N	0.00	H. PRECILA	8798502476	000000000000	\N	\N	0.00	CHANDEL CHRISTAIN	CHANDEL	795127	MANIPUR	CHANDEL CHRISTAIN	CHANDEL	795127	MANIPUR	[{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "7.83", "instituteName": "KOINONIA TRAINING SCHOOL", "subjectScores": "", "instituteAddress": "CHANDEL"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "COHSEM", "subjects": "PHYSICS \\nCHEMISTRY \\nBIOLOGY\\nALTERNATIVE ENGLISH \\nENGLISH", "percentage": "66", "instituteName": "ANALLON CHRISTAIN INSTITUTE", "subjectScores": "69\\n71\\n66\\n60\\n64", "instituteAddress": "LAMBUNG CHANDEL"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N
4	NUR-APP-2026-1UBGJ	1	2026-2027	ROJEETA BISTA	rojeetabista9@gmail.com	9233470406	Female	2008-01-03	KHARKHOLA, KALAPAHAR	30.00	general	converted	\N	3000.00	unadjusted	RCP-ADV-2026-FZKPH	2026-06-23	upi		2026-08-20 08:25:19.483958	2026-08-21 08:46:33.397	827436217575	AJAY BISTA	9233470406	000000000000	ASSISTANT TEACHER	\N	800000.00	REKHA BISTA	9862647495	000000000000	HOUSEWIFE	\N	0.00	KHARKHOLA, KALAPAHAR	KANGPOKPI	795122	MANIPUR	KHARKHOLA, KALAPAHAR	KANGPOKPI	795122	MANIPUR	[{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "7.50", "instituteName": "EMMANUEL ENGLISH SCHOOL", "subjectScores": "", "instituteAddress": "HAIPI, KEITHELMANBI"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "CBSE", "subjects": "ENGLISH CORE\\nPHYSICAL EDUCATION \\nPHYSICS\\nCHEMISTRY\\nBIOLOGY\\nMATHEMATICS", "percentage": "", "instituteName": "MT. EVEREST HR SEC SCHOOL", "subjectScores": "D1\\nC2\\nD2\\nD1\\nC2\\nD2", "instituteAddress": "TAPHOU SENAPATI MANIPUR"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N
13	NUR-APP-2024-T6DS0	1	2024-2025	LAIKHURAM LAXMI DEVI		8076417706	Female	2006-03-11	KONGBA KSHETRI LEIKAI	0.00	reserved	pending	\N	0.00	none	\N	\N	\N	\N	2026-08-22 07:33:54.626743	2026-08-22 07:33:54.626743	910618404042	LAIKHURAM IBOMACHA SINGH	0000000000	000000000000	\N	\N	0.00	LAIKHURAM ONGBI BIMOLA DEVI	9233829432	000000000000	\N	\N	0.00	KONGBA KSHETRI LEIKAI	IMPHAL EAST	795008	MANIPUR	KONGBA KSHETRI LEIKAI	IMPHAL EAST	795008	MANIPUR	[{"exam": "10th", "year": "2022", "board": "BOSEM", "subjects": "", "percentage": "", "instituteName": "DEEP PUB SCHOOL SEC-D PKT-II VASANT KUNJ", "subjectScores": "", "instituteAddress": "NEW DELHI"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2024", "board": "COHSEM", "subjects": "ENG\\nALTERNATICE ENG\\nPHY\\nHUMAN ECOLOGY AND FAMILY SC\\nCHEM \\nBIO", "percentage": "69.6%", "instituteName": "ROYAL ACADEMY OF SCIENCE", "subjectScores": "55\\n71\\n77\\n76\\n69\\n53", "instituteAddress": "GANGAPAT, KONGBA"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N
14	NUR-APP-2024-4OM3X	1	2024-2025	NORIKA CHANU SOIBAM		7085648259	Female	2006-09-11	WANGJING	0.00	general	pending	\N	0.00	none	\N	\N	\N	\N	2026-08-22 07:40:10.561719	2026-08-22 07:46:33.926	992535406668	SOIBAM PRIYOJIT SINGH	9615522063	000000000000	TEACHER	PRIVATE SCHOOL	0.00	SOIBAM GEETARANI DEVI	0000000000	000000000000	\N	\N	0.00	WANGJING	THOUBAL	795148	MANIPUR	WANGJING	THOUBAL	795148	MANIPUR	[{"exam": "10th", "year": "2021", "board": "CBSE", "subjects": "", "percentage": "", "instituteName": "SLOPELAND PUBLIC SCHOOL", "subjectScores": "", "instituteAddress": "SALT VILLAGE KGONGIOM MANIPUR"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2023", "board": "CBSE", "subjects": "ENG\\nMATHS\\nPHY\\nCHE\\nBIO\\nPAINTING", "percentage": "", "instituteName": "SLOPELAND PUBLIC SCHOOL", "subjectScores": "B1\\nB1\\nB1\\nA2\\nA1\\nA1", "instituteAddress": "SALT VILLAGE KGONGIOM MANIPUR"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N
15	NUR-APP-2024-KUM9W	1	2024-2025	BETSIBA KHORONG CHIRU		8787666364	Female	2007-03-09	NUNGSAI CHIRU VILLAGE	0.00	reserved	pending	\N	0.00	none	\N	\N	\N	\N	2026-08-22 07:54:29.352608	2026-08-22 07:54:29.352608	895025622197	KHORONG WILSON CHIRU	0000000000	000000000000	\N	\N	0.00	PEMI CHIRU	7876506522	000000000000	\N	\N	0.00	NUNGSAI CHIRU VILLAGE	BISHNUPUR	795126	MANIPUR	NUNGSAI CHIRU VILLAGE	BISHNUPUR	795126	MANIPUR	[{"exam": "10th", "year": "2022", "board": "CBSE", "subjects": "", "percentage": "", "instituteName": "MT. EVEREST HR SEC SCHOOL", "subjectScores": "", "instituteAddress": "TAPHOU SENAPATI MANIPUR"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2024", "board": "CBSE", "subjects": "ENG CORE\\nPHY\\nCHE\\nBIO\\nPHYSICAL EDUCATION\\nHOME SC", "percentage": "", "instituteName": "MT. EVEREST HR SEC SCHOOL", "subjectScores": "D1\\nB2\\nD2\\nC2\\nC2\\nB1", "instituteAddress": "TAPHOU SENAPATI MANIPUR"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N
16	NUR-APP-2024-6FWGP	1	2024-2025	THAIBEMA AHONGSHANGBAM		9362331086	Female	2006-03-02	SHIKHONG BAZAR	0.00	reserved	pending	\N	0.00	none	\N	\N	\N	\N	2026-08-22 08:13:30.163012	2026-08-22 08:13:30.163012	325103214859	(L) A. MEGHACHANDRA SINGH	0000000000	000000000000	\N	\N	0.00	NGANGOM SHANTI DEVI	7085498135	000000000000	GOVT. NURSE	HEALTH DEPARTMENT	0.00	SHIKHONG BAZAR	THOUBAL	795149	MANIPUR	SHIKHONG BAZAR	THOUBAL	795149	MANIPUR	[{"exam": "10th", "year": "2021", "board": "BOSEM", "subjects": "", "percentage": "", "instituteName": "EXCELLENT MODEL ACADEMY", "subjectScores": "", "instituteAddress": "UKHONGSHANG YAIRIPOK"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2023", "board": "COHSEM", "subjects": "ENG\\nMIL\\nPHY\\nBIO\\nCHE", "percentage": "56", "instituteName": "MILLENNIUM INSTITUTE OF SCIENCES", "subjectScores": "55\\n63\\n51\\n60\\n51", "instituteAddress": "SAGOLBAND, KWAKEITHEL MAYAIKOIBI"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: nursing_attendance_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_attendance_records (id, student_id, batch_id, session_date, subject_name, session_type, status, marked_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: nursing_audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_audit_logs (id, entity, entity_id, action, changed_by, diff, changed_at) FROM stdin;
1	nursing_applicants	1	CREATE	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	{"id": 1, "dob": "2015-08-11", "name": "ABC", "email": "acc.acmefertility@gmail.com", "notes": null, "phone": "7005854401", "gender": "Female", "status": "pending", "address": "Imphal East -795005", "courseId": 1, "createdAt": "2026-08-20T04:48:52.835Z", "updatedAt": "2026-08-20T04:48:52.835Z", "academicYear": "2026-2030", "applicationNo": "NUR-APP-2026-F13YJ", "quotaCategory": "general", "seatBookingDate": null, "seatBookingNotes": null, "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "45.00", "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-20 04:48:52.862709
2	nursing_courses	1	UPDATE	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	{"id": 1, "code": "BSC_NURSING", "name": "B.Sc Nursing", "active": true, "createdAt": "2026-08-19T03:42:03.454Z", "updatedAt": "2026-08-20T05:19:49.251Z", "totalSeats": 40, "durationYears": 4, "regulatoryBody": "Manipur Nursing Council"}	2026-08-20 05:19:49.295826
3	nursing_batches	1	CREATE	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	{"id": 1, "active": true, "endDate": "2028-06-30", "section": "A", "courseId": 1, "maxSeats": 40, "createdAt": "2026-08-20T05:20:10.024Z", "startDate": "2024-08-01", "updatedAt": "2026-08-20T05:20:10.024Z", "academicYear": "2024-2028"}	2026-08-20 05:20:10.05464
4	nursing_batches	2	CREATE	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	{"id": 2, "active": true, "endDate": "2029-06-30", "section": "A", "courseId": 1, "maxSeats": 40, "createdAt": "2026-08-20T05:20:29.680Z", "startDate": "2025-08-01", "updatedAt": "2026-08-20T05:20:29.680Z", "academicYear": "2025-2029"}	2026-08-20 05:20:29.704265
5	nursing_batches	3	CREATE	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	{"id": 3, "active": true, "endDate": "2030-06-30", "section": "A", "courseId": 1, "maxSeats": 40, "createdAt": "2026-08-20T05:20:37.172Z", "startDate": "2026-08-01", "updatedAt": "2026-08-20T05:20:37.172Z", "academicYear": "2026-2030"}	2026-08-20 05:20:37.192557
6	nursing_applicants	2	CREATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 2, "dob": "2007-09-25", "name": "NGAORAI BUNGSONG", "email": "", "notes": null, "phone": "8798502476", "gender": "Male", "status": "pending", "address": "CHANDEL CHRISTAIN", "aadharNo": "354602203740", "courseId": 1, "createdAt": "2026-08-20T06:20:08.319Z", "updatedAt": "2026-08-20T06:20:08.319Z", "fatherName": "(L) BS ROLLY ANAL", "motherName": "H. PRECILA", "fatherPhone": "0000000000", "motherPhone": "8798502476", "academicYear": "2026-2027", "presentState": "MANIPUR", "applicationNo": "NUR-APP-2026-8N51G", "quotaCategory": "general", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": "MANIPUR", "presentAddress": "CHANDEL CHRISTAIN", "presentPincode": "795127", "academicHistory": [{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "7.83", "instituteName": "KOINONIA TRAINING SCHOOL", "subjectScores": "", "instituteAddress": "CHANDEL"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "COHSEM", "subjects": "PHYSICS \\nCHEMISTRY \\nBIOLOGY\\nALTERNATIVE ENGLISH \\nENGLISH", "percentage": "66", "instituteName": "ANALLON CHRISTAIN INSTITUTE", "subjectScores": "69\\n71\\n66\\n60\\n64", "instituteAddress": "LAMBUNG CHANDEL"}], "presentDistrict": "CHANDEL", "seatBookingDate": null, "fatherOccupation": null, "motherOccupation": null, "permanentAddress": "CHANDEL CHRISTAIN", "permanentPincode": "795127", "seatBookingNotes": null, "permanentDistrict": "CHANDEL", "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "38.00", "fatherAnnualIncome": "0.00", "fatherOrganization": null, "motherAnnualIncome": "0.00", "motherOrganization": null, "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-20 06:20:08.353869
7	nursing_applicants	1	UPDATE_STATUS	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"status": "rejected"}	2026-08-20 06:20:27.547713
8	nursing_applicants	3	CREATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 3, "dob": "2008-12-12", "name": "CHANGKAMLIU GANGMEI", "email": "changkuamlugangmei@gmail.com", "notes": null, "phone": "9233170687", "gender": "Female", "status": "pending", "address": "THARON THANGMEIBAND", "aadharNo": "257355840941", "courseId": 1, "createdAt": "2026-08-20T06:39:25.662Z", "updatedAt": "2026-08-20T06:39:25.662Z", "fatherName": "KAJEIGAI GANGMEI", "motherName": "SUNITA GANGMEI", "fatherPhone": "8798549049", "motherPhone": "8798549049", "academicYear": "2026-2027", "presentState": "MANIPUR", "applicationNo": "NUR-APP-2026-R30FR", "quotaCategory": "general", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": "MANIPUR", "presentAddress": "THARON THANGMEIBAND", "presentPincode": "795001", "academicHistory": [{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "7.00", "instituteName": "KHANGSILLUNG HR. SEC. SCHOOL", "subjectScores": "", "instituteAddress": "KHOUPUM"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "COHSEM", "subjects": "ENGLISH\\nALTERNATIVE ENGLISH\\nPHYSICS\\nCHEMISTRY\\nBIOLOGY", "percentage": "51", "instituteName": "IBOTONSANA GIRL'S HIGHER SECONDARY SCHOOL", "subjectScores": "52\\n36\\n53\\n52\\n62", "instituteAddress": "IMPHAL"}], "presentDistrict": "IMPHAL WEST", "seatBookingDate": null, "fatherOccupation": "FARMER", "motherOccupation": null, "permanentAddress": "KHOUPUM", "permanentPincode": "795147", "seatBookingNotes": null, "permanentDistrict": "NONEY", "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "38.00", "fatherAnnualIncome": "90000.00", "fatherOrganization": null, "motherAnnualIncome": "90000.00", "motherOrganization": null, "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-20 06:39:25.686452
9	nursing_academic_schedules	1	CREATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 1, "batchId": 3, "endDate": "2027-01-20", "remarks": null, "semester": 1, "createdAt": "2026-08-20T06:41:32.776Z", "startDate": "2026-09-17", "updatedAt": "2026-08-20T06:41:32.776Z", "feeDueDate": "2026-10-02", "academicYear": "2026-2027", "feeDueOffsetDays": 15}	2026-08-20 06:41:32.828931
10	nursing_applicants	2	BOOK_SEAT_ADVANCE	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	{"amount": 60000, "paymentMode": "upi", "receiptNumber": "RCP-ADV-2026-XPCTP"}	2026-08-20 06:57:10.224619
11	nursing_applicants	4	CREATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 4, "dob": "2008-01-03", "name": "ROJEETA BISTA", "email": "rojeetabista9@gmail.com", "notes": null, "phone": "9233470406", "gender": "Female", "status": "pending", "address": "KHARKHOLA, KALAPAHAR", "aadharNo": "827436217575", "courseId": 1, "createdAt": "2026-08-20T08:25:19.483Z", "updatedAt": "2026-08-20T08:25:19.483Z", "fatherName": "AJAY BISTA", "motherName": "REKHA BISTA", "fatherPhone": "9233470406", "motherPhone": "9862647495", "academicYear": "2026-2027", "presentState": "MANIPUR", "applicationNo": "NUR-APP-2026-1UBGJ", "quotaCategory": "general", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": "MANIPUR", "presentAddress": "KHARKHOLA, KALAPAHAR", "presentPincode": "795122", "academicHistory": [{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "7.50", "instituteName": "EMMANUEL ENGLISH SCHOOL", "subjectScores": "", "instituteAddress": "HAIPI, KEITHELMANBI"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "CBSE", "subjects": "ENGLISH CORE\\nPHYSICAL EDUCATION \\nPHYSICS\\nCHEMISTRY\\nBIOLOGY\\nMATHEMATICS", "percentage": "", "instituteName": "MT. EVEREST HR SEC SCHOOL", "subjectScores": "D1\\nC2\\nD2\\nD1\\nC2\\nD2", "instituteAddress": "TAPHOU SENAPATI MANIPUR"}], "presentDistrict": "KANGPOKPI", "seatBookingDate": null, "fatherOccupation": "ASSISTANT TEACHER", "motherOccupation": "HOUSEWIFE", "permanentAddress": "KHARKHOLA, KALAPAHAR", "permanentPincode": "795122", "seatBookingNotes": null, "permanentDistrict": "KANGPOKPI", "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "30.00", "fatherAnnualIncome": "800000.00", "fatherOrganization": null, "motherAnnualIncome": "0.00", "motherOrganization": null, "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-20 08:25:19.49722
12	nursing_applicants	5	CREATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 5, "dob": "2004-07-04", "name": "MOSOKHO ALEOTEMEI", "email": "", "notes": null, "phone": "8798023370", "gender": "Male", "status": "pending", "address": "RABUNNAMAI", "aadharNo": "495096443298", "courseId": 1, "createdAt": "2026-08-20T08:38:56.301Z", "updatedAt": "2026-08-20T08:38:56.301Z", "fatherName": "ASHULI ASOSII", "motherName": "ATHILI KOMUNI", "fatherPhone": "8798023370", "motherPhone": "8798023370", "academicYear": "2026-2027", "presentState": "MANIPUR", "applicationNo": "NUR-APP-2026-EXE4X", "quotaCategory": "reserved", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": "MANIPUR", "presentAddress": "RABUNNAMAI", "presentPincode": "795150", "academicHistory": [{"exam": "10th", "year": "2020", "board": "BOSEM", "subjects": "", "percentage": "76.2", "instituteName": "OKAI ACADEMY", "subjectScores": "", "instituteAddress": "MAO"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2022", "board": "COHSEM", "subjects": "ENGLISH\\nALTERNATIVE ENGLISH\\nPHYSICS\\nBIOLOGY\\nCHEMISTRY", "percentage": "66", "instituteName": "HUMAN RESOURCE DEVELOPMENT ACADEMY", "subjectScores": "80\\n80\\n51\\n67\\n52", "instituteAddress": "GHARI"}], "presentDistrict": "SENAPATI", "seatBookingDate": null, "fatherOccupation": null, "motherOccupation": null, "permanentAddress": "RABUNNAMAI", "permanentPincode": "795150", "seatBookingNotes": null, "permanentDistrict": "SENAPATI", "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "47.00", "fatherAnnualIncome": "60000.00", "fatherOrganization": null, "motherAnnualIncome": "0.00", "motherOrganization": null, "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-20 08:38:56.318237
13	nursing_applicants	6	CREATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 6, "dob": "2008-03-11", "name": "LISON AYEKPAM", "email": "gaminglison@gmail.con", "notes": null, "phone": "6009462257", "gender": "Male", "status": "pending", "address": "KHURAI CHINGANGBAM LEIKAI TINSEED ROAD", "aadharNo": "447936129901", "courseId": 1, "createdAt": "2026-08-20T08:48:20.439Z", "updatedAt": "2026-08-20T08:48:20.439Z", "fatherName": "AYEKPAM MILANJIT SINGH", "motherName": "NINGOMBAM SHAYA DEVI", "fatherPhone": "9366238089", "motherPhone": "6009462257", "academicYear": "2026-2027", "presentState": "MANIPUR", "applicationNo": "NUR-APP-2026-X8LZ3", "quotaCategory": "reserved", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": null, "presentAddress": "KHURAI CHINGANGBAM LEIKAI TINSEED ROAD", "presentPincode": "795010", "academicHistory": [{"exam": "10th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}], "presentDistrict": "IMPHAL EAST", "seatBookingDate": null, "fatherOccupation": null, "motherOccupation": null, "permanentAddress": null, "permanentPincode": null, "seatBookingNotes": null, "permanentDistrict": null, "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "43.00", "fatherAnnualIncome": "0.00", "fatherOrganization": null, "motherAnnualIncome": "0.00", "motherOrganization": null, "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-20 08:48:20.456394
14	nursing_applicants	6	UPDATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 6, "dob": "2008-03-11", "name": "LISON AYEKPAM", "email": "gaminglison@gmail.con", "notes": null, "phone": "6009462257", "gender": "Male", "status": "pending", "address": "KHURAI CHINGANGBAM LEIKAI TINSEED ROAD", "aadharNo": "447936129901", "courseId": 1, "createdAt": "2026-08-20T08:48:20.439Z", "updatedAt": "2026-08-20T08:51:12.310Z", "fatherName": "AYEKPAM MILANJIT SINGH", "motherName": "NINGOMBAM SHAYA DEVI", "fatherPhone": "9366238089", "motherPhone": "6009462257", "academicYear": "2026-2027", "presentState": "MANIPUR", "applicationNo": "NUR-APP-2026-X8LZ3", "quotaCategory": "reserved", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": "MANIPUR", "presentAddress": "KHURAI CHINGANGBAM LEIKAI TINSEED ROAD", "presentPincode": "795010", "academicHistory": [{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "7.67", "instituteName": "FRIENDSHIP EDUCATIONAL ACADEMY", "subjectScores": "", "instituteAddress": "KHURAI"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "COHSEM", "subjects": "ENG\\nMIL\\nBIO\\nCHE\\nPHY", "percentage": "61", "instituteName": "DIVINE HISHER SECONDARI SCHOOL", "subjectScores": "53\\n47\\n75\\n76\\n54", "instituteAddress": "GHARI AWANG LEIKAI"}], "presentDistrict": "IMPHAL EAST", "seatBookingDate": null, "fatherOccupation": null, "motherOccupation": null, "permanentAddress": "KHURAI CHINGANGBAM LEIKAI TINSEED ROAD", "permanentPincode": "795010", "seatBookingNotes": null, "permanentDistrict": "IMPHAL EAST", "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "43.00", "fatherAnnualIncome": "0.00", "fatherOrganization": null, "motherAnnualIncome": "0.00", "motherOrganization": null, "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-20 08:51:12.330803
15	nursing_applicants	7	CREATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 7, "dob": "2008-03-04", "name": "NARENDRA KHUMUKCHAM", "email": "narendrakhumukcham389@gmail.com", "notes": null, "phone": "8974425668", "gender": "Male", "status": "pending", "address": "AWANGKHUNOU MAYAI LEIKAI", "aadharNo": "273328130014", "courseId": 1, "createdAt": "2026-08-20T09:23:07.683Z", "updatedAt": "2026-08-20T09:23:07.683Z", "fatherName": "KHUMUKCHAM NABACHANDRA", "motherName": "SENJAM ROMAPATI DEVI", "fatherPhone": "9436020682", "motherPhone": "8415826118", "academicYear": "2026-2027", "presentState": "MANIPUR", "applicationNo": "NUR-APP-2026-OMXDN", "quotaCategory": "reserved", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": "MANIPUR", "presentAddress": "AWANGKHUNOU MAYAI LEIKAI", "presentPincode": "795113", "academicHistory": [{"exam": "10th", "year": "2023", "board": "CBSE", "subjects": "", "percentage": "", "instituteName": "UNACCO SCHOOL EXCELLENCE IN EDUCATION", "subjectScores": "", "instituteAddress": "IMPHAL"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2025", "board": "CBSE", "subjects": "ENG CORE\\nHOME SC\\nCHE\\nBIO\\nPAINTING\\nPHY", "percentage": "", "instituteName": "UNACCO SCHOOL EXCELLENCE IN EDUCATION", "subjectScores": "D1\\nB2\\nD2\\nD2\\nB2\\nC2", "instituteAddress": "IMPHAL"}], "presentDistrict": "IMPHAL WEST", "seatBookingDate": null, "fatherOccupation": "GOVERMENT EMPLOYEE", "motherOccupation": "GOVERMENT EMPLOYEE", "permanentAddress": "AWANGKHUNOU MAYAI LEIKAI", "permanentPincode": "795113", "seatBookingNotes": null, "permanentDistrict": "IMPHAL WEST", "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "43.00", "fatherAnnualIncome": "542556.00", "fatherOrganization": "HEALTH DEPARTMENT", "motherAnnualIncome": "0.00", "motherOrganization": "HELATH DEPARTMENT", "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-20 09:23:07.707051
16	nursing_applicants	8	CREATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 8, "dob": "2008-03-31", "name": "YUMNAM ARBINDA", "email": "yumnamarbinda@gmail.com", "notes": null, "phone": "9362324683", "gender": "Male", "status": "pending", "address": "WAHENG KHUMAN MAYAI LEIKAI", "aadharNo": "861051247670", "courseId": 1, "createdAt": "2026-08-21T07:52:53.526Z", "updatedAt": "2026-08-21T07:52:53.526Z", "fatherName": "YUMNAM BASANTA SINGH", "motherName": "YUMNAM CHAOBA DEVI", "fatherPhone": "9678222390", "motherPhone": "9862168136", "academicYear": "2026-2027", "presentState": "MANIPUR", "applicationNo": "NUR-APP-2026-VPSK6", "quotaCategory": "reserved", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": "MANIPUR", "presentAddress": "WAHENG KHUMAN MAYAI LEIKAI", "presentPincode": "795134", "academicHistory": [{"exam": "10th", "year": "2023", "board": "BOSEM", "subjects": "", "percentage": "70.5", "instituteName": "CAREER GUIDANCE AND COUNSELLING CENTRE", "subjectScores": "", "instituteAddress": "WANGOI"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2025", "board": "CBSE", "subjects": "ENG CORE\\nMIL\\nPHY\\nBIO\\nCHE\\nPHYSICAL EDUCATION", "percentage": "", "instituteName": "UNACCO SCHOOL EXCELLENCE IN EDUCATION", "subjectScores": "A2\\nB1\\nD1\\nD2\\nC1\\nC1", "instituteAddress": "IMPHAL"}], "presentDistrict": "BISHNUPUR", "seatBookingDate": null, "fatherOccupation": "GOVT EMPLOYEE(CENTRAL)", "motherOccupation": "HOUSEWIFE", "permanentAddress": "WAHENG KHUMAN MAYAI LEIKAI", "permanentPincode": "795134", "seatBookingNotes": null, "permanentDistrict": "BISHNUPUR", "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "41.00", "fatherAnnualIncome": "0.00", "fatherOrganization": null, "motherAnnualIncome": "0.00", "motherOrganization": null, "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-21 07:52:53.545435
17	nursing_applicants	9	CREATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 9, "dob": "2008-10-15", "name": "SHOIBAM PHILISIA DEVI", "email": "", "notes": null, "phone": "8258095206", "gender": "Female", "status": "pending", "address": "THOUBAL ACHOUBA", "aadharNo": "227142243575", "courseId": 1, "createdAt": "2026-08-21T08:00:17.713Z", "updatedAt": "2026-08-21T08:00:17.713Z", "fatherName": "SHOIBAM SURAJ SINGH", "motherName": "SH. (O) MINAKSHI DEVI", "fatherPhone": "0000000000", "motherPhone": "0000000000", "academicYear": "2026-2027", "presentState": "MANIPUR", "applicationNo": "NUR-APP-2026-WOY2H", "quotaCategory": "reserved", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": "MANIPUR", "presentAddress": "THOUBAL ACHOUBA", "presentPincode": "795138", "academicHistory": [{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "8.33", "instituteName": "EVERGREEN FLOWER'S SCHOOL", "subjectScores": "", "instituteAddress": "THOUBAL"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "COHSEM", "subjects": "ENG\\nMIL\\nPHY\\nCHE\\nBIO", "percentage": "57.4", "instituteName": "COMET SCHOOL", "subjectScores": "34\\n45\\n72\\n64\\n72", "instituteAddress": "CHANGANGEI UCHECKON"}], "presentDistrict": "THOUBAL", "seatBookingDate": null, "fatherOccupation": null, "motherOccupation": "WEAVER", "permanentAddress": "THOUBAL ACHOUBA", "permanentPincode": "795138", "seatBookingNotes": null, "permanentDistrict": "THOUBAL", "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "38.00", "fatherAnnualIncome": "0.00", "fatherOrganization": null, "motherAnnualIncome": "90000.00", "motherOrganization": null, "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-21 08:00:17.73866
18	nursing_applicants	10	CREATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 10, "dob": "2007-11-05", "name": "TANIA CHONGTHAM", "email": "indirach059@gmail.com", "notes": null, "phone": "8787892098", "gender": "Female", "status": "pending", "address": "THONGJU PART II PECHU LAMPAK", "aadharNo": "400850621084", "courseId": 1, "createdAt": "2026-08-21T08:08:37.266Z", "updatedAt": "2026-08-21T08:08:37.266Z", "fatherName": "CHONGTHAM SURAJ SINGH", "motherName": "CHONGTHAM INDIRA DEVI", "fatherPhone": "8837380300", "motherPhone": "9856269131", "academicYear": "2026-2027", "presentState": "MANIPUR", "applicationNo": "NUR-APP-2026-DBYPN", "quotaCategory": "reserved", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": "MANIPUR", "presentAddress": "THONGJU PART II PECHU LAMPAK", "presentPincode": "795003", "academicHistory": [{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "6.50", "instituteName": "STANDARD ROBARTH HR. SEC. SCHOOL", "subjectScores": "", "instituteAddress": "CANCHIPUR"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "COHSEM", "subjects": "ENG\\nMIL\\nPHY\\nCHE \\nBIO\\nHUMA ECOLOGY AND FAMILY ACIENCES", "percentage": "58", "instituteName": "INTERNATIONAL SCHOOL OF RESOURCES", "subjectScores": "61\\n41\\n65\\n53\\n52\\n70", "instituteAddress": "CANCHIPUR"}], "presentDistrict": "IMPHAL EAST", "seatBookingDate": null, "fatherOccupation": "BUSINESS", "motherOccupation": "HOUSEWIFE", "permanentAddress": "THONGJU PART II PECHU LAMPAK", "permanentPincode": "795003", "seatBookingNotes": null, "permanentDistrict": "IMPHAL EAST", "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "25.00", "fatherAnnualIncome": "95000.00", "fatherOrganization": null, "motherAnnualIncome": "0.00", "motherOrganization": null, "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-21 08:08:37.283233
19	nursing_applicants	11	CREATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 11, "dob": "2009-01-10", "name": "MAIBAM MANGANLEIMA DEVI", "email": "", "notes": null, "phone": "7005881351", "gender": "Female", "status": "pending", "address": "SAGOLBAND KHAMNAM LEIRAK", "aadharNo": "826549643363", "courseId": 1, "createdAt": "2026-08-21T08:16:33.141Z", "updatedAt": "2026-08-21T08:16:33.141Z", "fatherName": "MAIBAM AMITABACHAN", "motherName": "MAIBAM SUNITA", "fatherPhone": "7005881351", "motherPhone": "9615705716", "academicYear": "2026-2027", "presentState": "MANIPUR", "applicationNo": "NUR-APP-2026-KIP4E", "quotaCategory": "reserved", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": "MANIPUR", "presentAddress": "SAGOLBAND KHAMNAM LEIRAK", "presentPincode": "795001", "academicHistory": [{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "6.33", "instituteName": "PITAMBARA ENGLISH SCHOOL", "subjectScores": "", "instituteAddress": "KWAKEITHEL"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "COHSEM", "subjects": "ENG\\nMIL\\nPHY\\nBIO\\nCHE\\nTHANG TA", "percentage": "64.4%", "instituteName": "DELTA ADVANCE SCHOOL", "subjectScores": "53\\n45\\n62\\n86\\n60\\n76", "instituteAddress": "KWAKEITHEL"}], "presentDistrict": "IMPHAL WEST", "seatBookingDate": null, "fatherOccupation": "TEACHER", "motherOccupation": "HOUSEWIFE", "permanentAddress": "SAGOLBAND KHAMNAM LEIRAK", "permanentPincode": "795001", "seatBookingNotes": null, "permanentDistrict": "IMPHAL WEST", "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "32.00", "fatherAnnualIncome": "90000.00", "fatherOrganization": "PRIVATE SCHOOL", "motherAnnualIncome": "0.00", "motherOrganization": null, "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-21 08:16:33.162842
20	nursing_applicants	12	CREATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 12, "dob": "2009-03-28", "name": "DEVIYA AKHONGBAM", "email": "", "notes": null, "phone": "9436295484", "gender": "Female", "status": "pending", "address": "SINGJAMEI WANGMA PEBIYA PANDIT LEIKAI", "aadharNo": "410250374314", "courseId": 1, "createdAt": "2026-08-21T08:23:30.925Z", "updatedAt": "2026-08-21T08:23:30.925Z", "fatherName": "AKHONGBAM DEVENDRO SINGH", "motherName": "NAOREM KHEMABATI DEVI", "fatherPhone": "0000000000", "motherPhone": "0000000000", "academicYear": "2026-2027", "presentState": "MANIPUR", "applicationNo": "NUR-APP-2026-8DPMT", "quotaCategory": "reserved", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": "MANIPUR", "presentAddress": "SINGJAMEI WANGMA PEBIYA PANDIT LEIKAI", "presentPincode": "795008", "academicHistory": [{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "7.67%", "instituteName": "BLOSSOM SCHOOL", "subjectScores": "", "instituteAddress": "CHANGANGEI"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "COHSEM", "subjects": "ENG\\nMIL\\nPHY\\nCHE\\nBIO\\nHEALTH AND PGYSICAL EDUCATION", "percentage": "69%", "instituteName": "MILLENIUM INSTITUTE OF SCIENCES", "subjectScores": "55\\n55\\n71\\n64\\n64\\n100", "instituteAddress": "SAGOLBAND, KWAKEITHEL MAYAIKOIBI"}], "presentDistrict": "IMPHAL EAST", "seatBookingDate": null, "fatherOccupation": "FARMER", "motherOccupation": "HOUSEWIFE", "permanentAddress": "SINGJAMEI WANGMA PEBIYA PANDIT LEIKAI", "permanentPincode": "795008", "seatBookingNotes": null, "permanentDistrict": "IMPHAL EAST", "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "25.00", "fatherAnnualIncome": "80000.00", "fatherOrganization": null, "motherAnnualIncome": "0.00", "motherOrganization": null, "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-21 08:23:30.957382
21	nursing_students	1	CONVERT_TO_STUDENT	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"studentId": 1, "applicantId": 2, "enrollmentNo": "NUR-STU-2026-0001"}	2026-08-21 08:35:44.565178
22	nursing_applicants	4	BOOK_SEAT_ADVANCE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"amount": 3000, "paymentMode": "upi", "receiptNumber": "RCP-ADV-2026-FZKPH"}	2026-08-21 08:43:35.49069
23	nursing_students	2	CONVERT_TO_STUDENT	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"studentId": 2, "applicantId": 4, "enrollmentNo": "NUR-STU-2026-0002"}	2026-08-21 08:46:33.412057
24	nursing_applicants	13	CREATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 13, "dob": "2006-03-11", "name": "LAIKHURAM LAXMI DEVI", "email": "", "notes": null, "phone": "8076417706", "gender": "Female", "status": "pending", "address": "KONGBA KSHETRI LEIKAI", "aadharNo": "910618404042", "courseId": 1, "createdAt": "2026-08-22T07:33:54.626Z", "updatedAt": "2026-08-22T07:33:54.626Z", "fatherName": "LAIKHURAM IBOMACHA SINGH", "motherName": "LAIKHURAM ONGBI BIMOLA DEVI", "fatherPhone": "0000000000", "motherPhone": "9233829432", "academicYear": "2024-2025", "presentState": "MANIPUR", "applicationNo": "NUR-APP-2024-T6DS0", "quotaCategory": "reserved", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": "MANIPUR", "presentAddress": "KONGBA KSHETRI LEIKAI", "presentPincode": "795008", "academicHistory": [{"exam": "10th", "year": "2022", "board": "BOSEM", "subjects": "", "percentage": "", "instituteName": "DEEP PUB SCHOOL SEC-D PKT-II VASANT KUNJ", "subjectScores": "", "instituteAddress": "NEW DELHI"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2024", "board": "COHSEM", "subjects": "ENG\\nALTERNATICE ENG\\nPHY\\nHUMAN ECOLOGY AND FAMILY SC\\nCHEM \\nBIO", "percentage": "69.6%", "instituteName": "ROYAL ACADEMY OF SCIENCE", "subjectScores": "55\\n71\\n77\\n76\\n69\\n53", "instituteAddress": "GANGAPAT, KONGBA"}], "presentDistrict": "IMPHAL EAST", "seatBookingDate": null, "fatherOccupation": null, "motherOccupation": null, "permanentAddress": "KONGBA KSHETRI LEIKAI", "permanentPincode": "795008", "seatBookingNotes": null, "permanentDistrict": "IMPHAL EAST", "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "0.00", "fatherAnnualIncome": "0.00", "fatherOrganization": null, "motherAnnualIncome": "0.00", "motherOrganization": null, "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-22 07:33:54.654105
25	nursing_applicants	14	CREATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 14, "dob": "2006-09-11", "name": "NORIKA CHANU SOIBAM", "email": "", "notes": null, "phone": "7085648259", "gender": "Female", "status": "pending", "address": "WANGJING", "aadharNo": "992535406668", "courseId": 1, "createdAt": "2026-08-22T07:40:10.561Z", "updatedAt": "2026-08-22T07:40:10.561Z", "fatherName": "SOIBAM PRIYOJIT SINGH", "motherName": "SOIBAM GEETARANI DEVI", "fatherPhone": "9615522063", "motherPhone": "0000000000", "academicYear": "2024-2025", "presentState": "MA", "applicationNo": "NUR-APP-2024-4OM3X", "quotaCategory": "general", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": null, "presentAddress": "WANGJING", "presentPincode": "795148", "academicHistory": [{"exam": "10th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}], "presentDistrict": "THOUBAL", "seatBookingDate": null, "fatherOccupation": "TEACHER", "motherOccupation": null, "permanentAddress": null, "permanentPincode": null, "seatBookingNotes": null, "permanentDistrict": null, "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "0.00", "fatherAnnualIncome": "0.00", "fatherOrganization": "PRIVATE SCHOOL", "motherAnnualIncome": "0.00", "motherOrganization": null, "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-22 07:40:10.576858
26	nursing_applicants	14	UPDATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 14, "dob": "2006-09-11", "name": "NORIKA CHANU SOIBAM", "email": "", "notes": null, "phone": "7085648259", "gender": "Female", "status": "pending", "address": "WANGJING", "aadharNo": "992535406668", "courseId": 1, "createdAt": "2026-08-22T07:40:10.561Z", "updatedAt": "2026-08-22T07:46:33.926Z", "fatherName": "SOIBAM PRIYOJIT SINGH", "motherName": "SOIBAM GEETARANI DEVI", "fatherPhone": "9615522063", "motherPhone": "0000000000", "academicYear": "2024-2025", "presentState": "MANIPUR", "applicationNo": "NUR-APP-2024-4OM3X", "quotaCategory": "general", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": "MANIPUR", "presentAddress": "WANGJING", "presentPincode": "795148", "academicHistory": [{"exam": "10th", "year": "2021", "board": "CBSE", "subjects": "", "percentage": "", "instituteName": "SLOPELAND PUBLIC SCHOOL", "subjectScores": "", "instituteAddress": "SALT VILLAGE KGONGIOM MANIPUR"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2023", "board": "CBSE", "subjects": "ENG\\nMATHS\\nPHY\\nCHE\\nBIO\\nPAINTING", "percentage": "", "instituteName": "SLOPELAND PUBLIC SCHOOL", "subjectScores": "B1\\nB1\\nB1\\nA2\\nA1\\nA1", "instituteAddress": "SALT VILLAGE KGONGIOM MANIPUR"}], "presentDistrict": "THOUBAL", "seatBookingDate": null, "fatherOccupation": "TEACHER", "motherOccupation": null, "permanentAddress": "WANGJING", "permanentPincode": "795148", "seatBookingNotes": null, "permanentDistrict": "THOUBAL", "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "0.00", "fatherAnnualIncome": "0.00", "fatherOrganization": "PRIVATE SCHOOL", "motherAnnualIncome": "0.00", "motherOrganization": null, "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-22 07:46:33.949854
27	nursing_applicants	15	CREATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 15, "dob": "2007-03-09", "name": "BETSIBA KHORONG CHIRU", "email": "", "notes": null, "phone": "8787666364", "gender": "Female", "status": "pending", "address": "NUNGSAI CHIRU VILLAGE", "aadharNo": "895025622197", "courseId": 1, "createdAt": "2026-08-22T07:54:29.352Z", "updatedAt": "2026-08-22T07:54:29.352Z", "fatherName": "KHORONG WILSON CHIRU", "motherName": "PEMI CHIRU", "fatherPhone": "0000000000", "motherPhone": "7876506522", "academicYear": "2024-2025", "presentState": "MANIPUR", "applicationNo": "NUR-APP-2024-KUM9W", "quotaCategory": "reserved", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": "MANIPUR", "presentAddress": "NUNGSAI CHIRU VILLAGE", "presentPincode": "795126", "academicHistory": [{"exam": "10th", "year": "2022", "board": "CBSE", "subjects": "", "percentage": "", "instituteName": "MT. EVEREST HR SEC SCHOOL", "subjectScores": "", "instituteAddress": "TAPHOU SENAPATI MANIPUR"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2024", "board": "CBSE", "subjects": "ENG CORE\\nPHY\\nCHE\\nBIO\\nPHYSICAL EDUCATION\\nHOME SC", "percentage": "", "instituteName": "MT. EVEREST HR SEC SCHOOL", "subjectScores": "D1\\nB2\\nD2\\nC2\\nC2\\nB1", "instituteAddress": "TAPHOU SENAPATI MANIPUR"}], "presentDistrict": "BISHNUPUR", "seatBookingDate": null, "fatherOccupation": null, "motherOccupation": null, "permanentAddress": "NUNGSAI CHIRU VILLAGE", "permanentPincode": "795126", "seatBookingNotes": null, "permanentDistrict": "BISHNUPUR", "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "0.00", "fatherAnnualIncome": "0.00", "fatherOrganization": null, "motherAnnualIncome": "0.00", "motherOrganization": null, "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-22 07:54:29.379723
28	nursing_applicants	16	CREATE	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	{"id": 16, "dob": "2006-03-02", "name": "THAIBEMA AHONGSHANGBAM", "email": "", "notes": null, "phone": "9362331086", "gender": "Female", "status": "pending", "address": "SHIKHONG BAZAR", "aadharNo": "325103214859", "courseId": 1, "createdAt": "2026-08-22T08:13:30.163Z", "updatedAt": "2026-08-22T08:13:30.163Z", "fatherName": "(L) A. MEGHACHANDRA SINGH", "motherName": "NGANGOM SHANTI DEVI", "fatherPhone": "0000000000", "motherPhone": "7085498135", "academicYear": "2024-2025", "presentState": "MANIPUR", "applicationNo": "NUR-APP-2024-6FWGP", "quotaCategory": "reserved", "fatherAadharNo": "000000000000", "motherAadharNo": "000000000000", "permanentState": "MANIPUR", "presentAddress": "SHIKHONG BAZAR", "presentPincode": "795149", "academicHistory": [{"exam": "10th", "year": "2021", "board": "BOSEM", "subjects": "", "percentage": "", "instituteName": "EXCELLENT MODEL ACADEMY", "subjectScores": "", "instituteAddress": "UKHONGSHANG YAIRIPOK"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2023", "board": "COHSEM", "subjects": "ENG\\nMIL\\nPHY\\nBIO\\nCHE", "percentage": "56", "instituteName": "MILLENNIUM INSTITUTE OF SCIENCES", "subjectScores": "55\\n63\\n51\\n60\\n51", "instituteAddress": "SAGOLBAND, KWAKEITHEL MAYAIKOIBI"}], "presentDistrict": "THOUBAL", "seatBookingDate": null, "fatherOccupation": null, "motherOccupation": "GOVT. NURSE", "permanentAddress": "SHIKHONG BAZAR", "permanentPincode": "795149", "seatBookingNotes": null, "permanentDistrict": "THOUBAL", "seatBookingAmount": "0.00", "seatBookingStatus": "none", "entranceMeritScore": "0.00", "fatherAnnualIncome": "0.00", "fatherOrganization": null, "motherAnnualIncome": "0.00", "motherOrganization": "HEALTH DEPARTMENT", "seatBookingReceiptNo": null, "seatBookingPaymentMode": null}	2026-08-22 08:13:30.186555
\.


--
-- Data for Name: nursing_batches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_batches (id, course_id, academic_year, section, max_seats, start_date, end_date, active, created_at, updated_at) FROM stdin;
1	1	2024-2028	A	40	2024-08-01	2028-06-30	t	2026-08-20 05:20:10.024917	2026-08-20 05:20:10.024917
2	1	2025-2029	A	40	2025-08-01	2029-06-30	t	2026-08-20 05:20:29.680664	2026-08-20 05:20:29.680664
3	1	2026-2030	A	40	2026-09-17	2027-01-20	t	2026-08-20 05:20:37.172562	2026-08-20 06:41:32.81
\.


--
-- Data for Name: nursing_courses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_courses (id, code, name, duration_years, total_seats, regulatory_body, active, created_at, updated_at) FROM stdin;
1	BSC_NURSING	B.Sc Nursing	4	40	Manipur Nursing Council	t	2026-08-19 03:42:03.454501	2026-08-20 05:19:49.251
\.


--
-- Data for Name: nursing_fee_structures; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_fee_structures (id, course_id, quota_category, academic_year, fee_type, payment_frequency, one_time_rebate_percent, tuition_fee, admission_fee, security_deposit, uniform_fee, hostel_fee, hostel_mess_monthly_fee, exam_fee, misc_fee, rebates_config, surcharges_config, components_config, total_amount, created_at, updated_at) FROM stdin;
1	1	none	2026-2030	Composite Course Fee	yearly	10.00	100000.00	0.00	5000.00	5000.00	0.00	6500.00	0.00	0.00	\N	\N	[{"id":"c1","name":"Course Fee","amount":100000,"selectedFrequencyKey":"quarterly","frequencyRows":[{"id":"f-monthly","key":"monthly","label":"Monthly","count":12,"rebatePercent":0,"surchargePercent":9},{"id":"f-quarterly","key":"quarterly","label":"Quarterly","count":4,"rebatePercent":0,"surchargePercent":0},{"id":"f-semester","key":"semester","label":"Per-Semester","count":2,"rebatePercent":0,"surchargePercent":0},{"id":"f-annually","key":"annually","label":"Annually","count":1,"rebatePercent":10,"surchargePercent":0}]},{"id":"c5","name":"Hostel & Mess Fee","amount":78000,"selectedFrequencyKey":"monthly","frequencyRows":[{"id":"f-monthly","key":"monthly","label":"Monthly","count":12,"rebatePercent":0,"surchargePercent":0}]},{"id":"comp-1787203351368-5nts","name":"Security Deposit","amount":5000,"selectedFrequencyKey":"one_time","frequencyRows":[{"id":"f-one_time-1787203377689","key":"one_time","label":"One-Time (Course Duration)","count":1,"rebatePercent":0,"surchargePercent":0}]},{"id":"comp-1787303012483-7rk8","name":"Uniform","amount":5000,"selectedFrequencyKey":"annually","frequencyRows":[{"id":"f-annually","key":"annually","label":"Annually","count":1,"rebatePercent":0,"surchargePercent":0}]},{"id":"comp-1787303088810-r4l2","name":"Text Books","amount":5000,"selectedFrequencyKey":"semester","frequencyRows":[{"id":"f-annually","key":"annually","label":"Annually","count":1,"rebatePercent":0,"surchargePercent":0},{"id":"f-semester-1787303101865","key":"semester","label":"Per-Semester","count":2,"rebatePercent":0,"surchargePercent":0}]}]	188000.00	2026-08-20 05:22:35.327209	2026-08-21 09:05:26.843
\.


--
-- Data for Name: nursing_fee_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_fee_transactions (id, student_id, applicant_id, fee_structure_id, invoice_no, receipt_number, fee_type, payment_frequency, amount, payment_mode, payment_date, status, remarks, collected_by, created_at, updated_at) FROM stdin;
1	1	2	\N	INV-ADV-2026-W4E72	RCP-ADV-2026-XPCTP	Seat Booking Advance	one_time	60000.00	upi	2026-07-02	paid	"{\\"isSeatBookingAdvance\\":true,\\"applicationNo\\":\\"NUR-APP-2026-8N51G\\",\\"applicantName\\":\\"NGAORAI BUNGSONG\\",\\"courseName\\":\\"B.Sc Nursing\\",\\"academicYear\\":\\"2026-2027\\",\\"notes\\":\\"\\"}"	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	2026-08-20 06:57:10.168372	2026-08-20 06:57:10.168372
2	2	4	\N	INV-ADV-2026-YAMR6	RCP-ADV-2026-FZKPH	Seat Booking Advance	one_time	3000.00	upi	2026-06-23	paid	"{\\"isSeatBookingAdvance\\":true,\\"applicationNo\\":\\"NUR-APP-2026-1UBGJ\\",\\"applicantName\\":\\"ROJEETA BISTA\\",\\"courseName\\":\\"B.Sc Nursing\\",\\"academicYear\\":\\"2026-2027\\",\\"notes\\":\\"\\"}"	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	2026-08-21 08:43:35.453984	2026-08-21 08:43:35.453984
\.


--
-- Data for Name: nursing_referrer_payment_allocations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_referrer_payment_allocations (id, payment_id, student_id, applicant_id, amount, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: nursing_referrer_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_referrer_payments (id, referrer_id, voucher_no, payment_date, amount, payment_mode, reference_number, paid_by, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: nursing_referrers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_referrers (id, name, phone, email, address, comments, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: nursing_student_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_student_documents (id, applicant_id, student_id, document_type, title, file_url, verification_status, verified_by, verified_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: nursing_student_fee_frequencies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_student_fee_frequencies (id, student_id, academic_year, component_id, component_name, frequency_key, frequency_label, installment_count, base_amount, installment_amount, locked_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: nursing_students; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_students (id, applicant_id, batch_id, enrollment_no, name, email, phone, gender, dob, address, guardian_name, guardian_phone, guardian_relation, status, admission_date, created_at, updated_at, aadhar_no, father_name, father_phone, father_aadhar_no, father_occupation, father_organization, father_annual_income, mother_name, mother_phone, mother_aadhar_no, mother_occupation, mother_organization, mother_annual_income, present_address, present_district, present_pincode, present_state, permanent_address, permanent_district, permanent_pincode, permanent_state, academic_history, referrer_id, referral_amount, referral_comments, father_deceased, mother_deceased, has_guardian, guardian_aadhar_no, guardian_occupation, guardian_organization, guardian_annual_income) FROM stdin;
1	2	3	NUR-STU-2026-0001	NGAORAI BUNGSONG		8798502476	Male	2007-09-25	CHANDEL CHRISTAIN	H. PRECILA	8798502476	Mother	active	2026-08-21	2026-08-21 08:35:44.530708	2026-08-21 08:39:39.441	354602203740	(L) BS ROLLY ANAL	0000000000	000000000000			0.00	H. PRECILA	8798502476	000000000000			0.00	CHANDEL CHRISTAIN	CHANDEL	795127	MANIPUR	CHANDEL CHRISTAIN	CHANDEL	795127	MANIPUR	[{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "7.83", "instituteName": "KOINONIA TRAINING SCHOOL", "subjectScores": "", "instituteAddress": "CHANDEL"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "COHSEM", "subjects": "PHYSICS \\nCHEMISTRY \\nBIOLOGY\\nALTERNATIVE ENGLISH \\nENGLISH", "percentage": "66", "instituteName": "ANALLON CHRISTAIN INSTITUTE", "subjectScores": "69\\n71\\n66\\n60\\n64", "instituteAddress": "LAMBUNG CHANDEL"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N
2	4	3	NUR-STU-2026-0002	ROJEETA BISTA	rojeetabista9@gmail.com	9233470406	Female	2008-01-03	KHARKHOLA, KALAPAHAR	AJAY BISTA	9233470406	Mother	active	2026-08-21	2026-08-21 08:46:33.360879	2026-08-21 08:46:33.360879	827436217575	AJAY BISTA	9233470406	000000000000	ASSISTANT TEACHER	\N	800000.00	REKHA BISTA	9862647495	000000000000	HOUSEWIFE	\N	0.00	KHARKHOLA, KALAPAHAR	KANGPOKPI	795122	MANIPUR	KHARKHOLA, KALAPAHAR	KANGPOKPI	795122	MANIPUR	[{"exam": "10th", "year": "2024", "board": "BOSEM", "subjects": "", "percentage": "7.50", "instituteName": "EMMANUEL ENGLISH SCHOOL", "subjectScores": "", "instituteAddress": "HAIPI, KEITHELMANBI"}, {"exam": "11th", "year": "", "board": "", "subjects": "", "percentage": "", "subjectScores": ""}, {"exam": "12th", "year": "2026", "board": "CBSE", "subjects": "ENGLISH CORE\\nPHYSICAL EDUCATION \\nPHYSICS\\nCHEMISTRY\\nBIOLOGY\\nMATHEMATICS", "percentage": "", "instituteName": "MT. EVEREST HR SEC SCHOOL", "subjectScores": "D1\\nC2\\nD2\\nD1\\nC2\\nD2", "instituteAddress": "TAPHOU SENAPATI MANIPUR"}]	\N	\N	\N	f	f	f	\N	\N	\N	\N
\.


--
-- Data for Name: nursing_subjects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_subjects (id, course_id, code, name, year, semester, theory_max_marks, practical_max_marks, credits, active, created_at, updated_at) FROM stdin;
1	1	NURS-101	Communicative English	1	1	50	0	3	t	2026-08-19 03:42:03.479631	2026-08-19 03:42:03.479631
2	1	NURS-102	Applied Anatomy & Applied Physiology	1	1	75	25	6	t	2026-08-19 03:42:03.494653	2026-08-19 03:42:03.494653
3	1	NURS-103	Applied Sociology & Applied Psychology	1	1	75	25	6	t	2026-08-19 03:42:03.504327	2026-08-19 03:42:03.504327
4	1	NURS-104	Nursing Foundation I (Theory & Practical)	1	1	75	100	10	t	2026-08-19 03:42:03.513529	2026-08-19 03:42:03.513529
5	1	NURS-201	Applied Biochemistry & Applied Nutrition & Dietetics	1	2	75	25	5	t	2026-08-19 03:42:03.524737	2026-08-19 03:42:03.524737
6	1	NURS-202	Nursing Foundation II (Theory & Clinical)	1	2	75	100	12	t	2026-08-19 03:42:03.538553	2026-08-19 03:42:03.538553
7	1	NURS-203	Health/Nursing Informatics & Technology	1	2	50	50	3	t	2026-08-19 03:42:03.549361	2026-08-19 03:42:03.549361
8	1	NURS-301	Applied Microbiology & Infection Control & Safety	2	3	75	25	4	t	2026-08-19 03:42:03.558956	2026-08-19 03:42:03.558956
9	1	NURS-302	Pharmacology I, Pathology I & Genetics	2	3	75	25	5	t	2026-08-19 03:42:03.568272	2026-08-19 03:42:03.568272
10	1	NURS-303	Adult Health Nursing I (Medical Surgical Nursing I)	2	3	75	100	12	t	2026-08-19 03:42:03.580323	2026-08-19 03:42:03.580323
11	1	NURS-401	Pharmacology II & Pathology II	2	4	75	25	5	t	2026-08-19 03:42:03.590521	2026-08-19 03:42:03.590521
12	1	NURS-402	Adult Health Nursing II (Medical Surgical Nursing II)	2	4	75	100	12	t	2026-08-19 03:42:03.599841	2026-08-19 03:42:03.599841
13	1	NURS-403	Professionalism, Professional Values & Ethics	2	4	50	0	2	t	2026-08-19 03:42:03.608878	2026-08-19 03:42:03.608878
14	1	NURS-501	Child Health Nursing I (Pediatric Nursing I)	3	5	75	50	6	t	2026-08-19 03:42:03.618076	2026-08-19 03:42:03.618076
15	1	NURS-502	Mental Health Nursing I (Psychiatric Nursing I)	3	5	75	50	6	t	2026-08-19 03:42:03.640713	2026-08-19 03:42:03.640713
16	1	NURS-503	Community Health Nursing I	3	5	75	50	6	t	2026-08-19 03:42:03.649894	2026-08-19 03:42:03.649894
17	1	NURS-504	Educational Technology / Nursing Education	3	5	75	25	3	t	2026-08-19 03:42:03.659161	2026-08-19 03:42:03.659161
18	1	NURS-601	Child Health Nursing II (Pediatric Nursing II)	3	6	75	50	4	t	2026-08-19 03:42:03.669203	2026-08-19 03:42:03.669203
19	1	NURS-602	Mental Health Nursing II (Psychiatric Nursing II)	3	6	75	50	4	t	2026-08-19 03:42:03.682137	2026-08-19 03:42:03.682137
20	1	NURS-603	Nursing Management & Leadership	3	6	75	25	4	t	2026-08-19 03:42:03.691325	2026-08-19 03:42:03.691325
21	1	NURS-604	Midwifery & Obstetrical Nursing I	3	6	75	50	6	t	2026-08-19 03:42:03.700429	2026-08-19 03:42:03.700429
22	1	NURS-701	Community Health Nursing II	4	7	75	50	6	t	2026-08-19 03:42:03.713183	2026-08-19 03:42:03.713183
23	1	NURS-702	Midwifery & Obstetrical Nursing II	4	7	75	50	6	t	2026-08-19 03:42:03.722916	2026-08-19 03:42:03.722916
24	1	NURS-703	Nursing Research & Statistics	4	7	75	25	4	t	2026-08-19 03:42:03.731976	2026-08-19 03:42:03.731976
25	1	NURS-801	Intensive Clinical Practicum / Internship	4	8	0	200	16	t	2026-08-19 03:42:03.74099	2026-08-19 03:42:03.74099
\.


--
-- Data for Name: nursing_supers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nursing_supers (id, staff_id, active, created_at, updated_at) FROM stdin;
1	7	t	2026-08-02 06:05:54.825611	2026-08-02 06:05:54.825611
2	6	t	2026-08-02 06:05:59.834649	2026-08-02 06:05:59.834649
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.patients (id, mrn, name, age, gender, phone, address, blood_group, allergies, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payslips; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payslips (id, staff_id, month, basic_salary, hra, conveyance, special, epf, esi, professional_tax, other_deductions, late_attendance, leave_days_taken, leave_deduction, net_salary, version, status, hr_notes, coo_notes, accounts_notes, created_at, updated_at, skill_allowance, earned_leave_encashment, extra_day_allowance, tds, security_deposit, payment_mode, bank_name, account_number, ifsc_code, cheque_number, cheque_date) FROM stdin;
\.


--
-- Data for Name: po_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.po_items (id, po_id, item_name, category, ordered_qty, unit_rate, gst_percent, line_value, created_at, unit_id) FROM stdin;
\.


--
-- Data for Name: po_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.po_payments (id, po_id, payment_date, amount, payment_mode, reference_no, remarks, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: prescription_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.prescription_lines (id, prescription_id, medicine_id, dosage, duration, quantity, instructions) FROM stdin;
\.


--
-- Data for Name: prescriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.prescriptions (id, patient_id, doctor_id, encounter_id, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_orders (id, po_no, po_date, vendor_id, po_status, payment_status, total_value, remarks, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: report_category_exclusions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.report_category_exclusions (id, user_id, report_type, excluded_categories, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: rosters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rosters (id, staff_id, department_id, shift_id, notes, created_at, updated_at, date) FROM stdin;
4	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-01
5	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-02
6	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-03
7	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-04
8	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-05
9	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-06
10	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-07
11	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-08
12	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-09
13	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-10
14	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-11
15	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-12
16	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-13
17	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-14
18	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-15
19	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-16
20	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-17
21	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-18
22	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-19
23	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-20
24	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-21
25	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-22
26	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-23
27	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-24
28	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-25
29	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-26
30	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-27
31	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-28
32	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-29
33	4	6	6	\N	2026-07-16 05:26:39.532941	2026-07-16 05:26:39.532941	2026-06-30
35	16	19	7		2026-08-01 11:39:40.798853	2026-08-01 11:39:40.798853	2026-08-01
36	16	19	6		2026-08-01 11:39:49.70988	2026-08-01 11:39:49.70988	2026-08-02
37	53	19	3		2026-08-01 11:39:56.848205	2026-08-01 11:39:56.848205	2026-08-01
39	53	19	2		2026-08-01 11:40:31.238894	2026-08-01 11:40:31.238894	2026-08-03
40	53	19	4		2026-08-01 11:40:37.753486	2026-08-01 11:40:37.753486	2026-08-06
41	53	19	4		2026-08-01 11:40:40.452668	2026-08-01 11:40:40.452668	2026-08-07
42	48	19	3		2026-08-01 11:46:03.671354	2026-08-01 11:46:03.671354	2026-08-07
43	48	19	2		2026-08-01 11:46:08.753321	2026-08-01 11:46:08.753321	2026-08-08
44	48	19	4		2026-08-01 11:46:10.551824	2026-08-01 11:46:10.551824	2026-08-09
45	16	19	7		2026-08-02 05:17:08.108276	2026-08-02 05:17:08.108276	2026-08-03
46	16	19	6		2026-08-02 05:17:09.48994	2026-08-02 05:17:09.48994	2026-08-05
47	53	19	3		2026-08-02 05:17:11.637242	2026-08-02 05:17:11.637242	2026-08-05
48	57	2	5	Leave Request: LV-N8F81	2026-08-06 09:20:03.703051	2026-08-06 09:20:03.703051	2026-08-02
49	57	2	1	Leave Request: LV-L0JWA	2026-08-06 09:20:12.434732	2026-08-06 09:20:12.434732	2026-07-23
50	57	2	5	Leave Request: LV-B9EXM	2026-08-06 09:20:19.985937	2026-08-06 09:20:19.985937	2026-07-21
51	3	6	5	Leave Request: LV-TLGO8	2026-08-06 09:20:27.351863	2026-08-06 09:20:27.351863	2026-07-15
52	15	19	2		2026-08-17 06:43:10.780441	2026-08-17 06:43:10.780441	2026-08-01
53	72	19	8		2026-08-17 06:43:14.970606	2026-08-17 06:43:14.970606	2026-08-01
54	48	19	9		2026-08-17 06:43:18.431429	2026-08-17 06:43:18.431429	2026-08-01
\.


--
-- Data for Name: security_deposit_refunds; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.security_deposit_refunds (id, staff_id, amount, refund_date, notes, processed_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: service_catalog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_catalog (id, department, service_name, default_rate, sort_order, default_show, created_at, updated_at) FROM stdin;
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
60	HUMAN_KIND	SALES	0.00	0	f	2026-07-30 11:28:40.672409	2026-07-30 11:28:40.672409
62	IPD	RE-ADVANCE	0.00	0	f	2026-07-31 07:44:21.187978	2026-07-31 07:44:21.187978
63	IVF	IUI(B)	20000.00	26	f	2026-07-31 09:36:38.995585	2026-07-31 09:36:38.995585
64	OPD	DIAGNOSTIC HYSTEROSCOPY	17000.00	0	f	2026-07-31 09:51:35.723159	2026-07-31 09:51:35.723159
65	OPD-INJECTION	INJECTION INCOME	0.00	0	f	2026-07-31 09:58:08.934815	2026-07-31 09:58:08.934815
66	OPD	MEDICAL CERTIFICATE CHARGE	500.00	0	f	2026-07-31 10:47:07.109247	2026-07-31 10:47:07.109247
99	OPD	TCA	1200.00	0	f	2026-08-02 06:22:37.262214	2026-08-02 06:22:37.262214
100	IVF	IVF COUNSELLING	500.00	0	f	2026-08-02 06:24:39.046426	2026-08-02 06:24:39.046426
102	OPD	D/E	11000.00	0	f	2026-08-02 09:10:14.425312	2026-08-02 09:10:14.425312
103	OPD	REGISTRATION CHARGE	50.00	0	f	2026-08-02 11:34:56.086268	2026-08-02 11:34:56.086268
104	OUTSOURCING	BABINA DIAGNOSTICS	0.00	1	f	2026-08-03 09:31:37.348259	2026-08-03 09:31:37.348259
105	OPD	DJ STENTING & CYSTOSCOPY > GA	0.00	0	f	2026-08-04 08:26:14.071206	2026-08-04 08:26:14.071206
106	OUTSOURCING	LIFECELL	0.00	0	f	2026-08-04 10:03:41.232846	2026-08-04 10:03:41.232846
107	OPD	SSG	3000.00	0	f	2026-08-05 06:38:15.44538	2026-08-05 06:38:15.44538
108	OPD	SEDATION	1100.00	0	f	2026-08-05 06:38:38.86125	2026-08-05 06:38:38.86125
109	DENTAL	X-RAY RUG	250.00	0	f	2026-08-06 06:51:42.818292	2026-08-06 06:56:17.219
110	OPD	TVS SCREENING	600.00	0	f	2026-08-08 07:11:28.824825	2026-08-08 07:11:28.824825
111	OPD	CHEST X-RAY	500.00	0	f	2026-08-11 09:37:37.793477	2026-08-11 09:37:37.793477
115	OPD	TELE OPD	700.00	0	f	2026-08-19 10:56:51.226292	2026-08-19 10:56:51.226292
2	OPD	OLD CASE	450.00	0	f	2026-07-15 11:39:37.98347	2026-08-15 11:32:00.009
112	OPD	OLD CASE(NEW)	500.00	0	t	2026-08-15 11:29:00.934888	2026-08-15 11:32:06.494
101	OPD	NEW CASE(NEW)	600.00	0	t	2026-08-02 06:36:26.930834	2026-08-18 09:32:18.371
3	OPD	NEW CASE	550.00	0	f	2026-07-15 11:40:00.434355	2026-08-18 09:32:25.697
113	DENTAL	SCALING	2160.00	0	f	2026-08-18 09:40:11.089768	2026-08-18 09:40:11.089768
114	OPD	CYST ASPIRATION UNDER SGA\t\t	25000.00	0	f	2026-08-18 10:28:09.23666	2026-08-18 10:28:09.23666
116	OTHER_INCOME	AMBULANCE CHARGE 	500.00	0	f	2026-08-19 11:00:07.19177	2026-08-19 11:00:07.19177
117	MINOR_INCOME	BED CHARGE	0.00	0	f	2026-08-22 11:38:48.918249	2026-08-22 11:38:48.918249
118	DENTAL	OPD(NEW)	500.00	0	t	2026-08-23 09:32:25.188038	2026-08-23 09:32:25.188038
\.


--
-- Data for Name: service_categories; Type: TABLE DATA; Schema: public; Owner: -
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
2	IPD	IPD	9	t	f	2026-07-15 11:35:50.202767	2026-07-18 10:56:22.615
11	CASH_RETURN	CASH RETURN	11	t	f	2026-07-20 10:45:44.933466	2026-07-20 10:45:44.933466
12	IMMUNIZATION(NICU)	IMMUNIZATION (NICU)	12	t	f	2026-07-20 11:34:18.780615	2026-07-20 11:34:18.780615
13	OTHER_INCOME	OTHER INCOME	13	t	f	2026-07-25 06:57:47.466081	2026-07-25 06:57:47.466081
14	HUMAN_KIND	human kind sales	14	t	f	2026-07-30 11:27:37.931205	2026-07-30 11:27:37.931205
5	PHARMACY	Dispensary	8	t	f	2026-07-15 11:38:01.826067	2026-07-31 09:49:27.192
15	OPD-INJECTION	OPD-INJECTION	10	t	f	2026-07-31 09:56:51.171321	2026-07-31 09:56:51.171321
16	ADVERTISING_&_PROMOTION	ADVERTISING & PROMOTION	15	f	f	2026-08-17 11:39:56.455433	2026-08-17 11:41:37.111
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.session (id, "expiresAt", token, "ipAddress", "userAgent", "userId", "impersonatedBy", "createdAt", "updatedAt") FROM stdin;
HgmjeKY9ifWwaVN3fmfFn8jQUpPGq77s	2026-07-22 04:55:41.369	aJRnRUMj1SAfUj3G3sNyBQA1KTYBd0K6		Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	\N	2026-07-15 04:55:41.369	2026-07-15 04:55:41.369
AkjsASWqGWDmSvwCQFoo2Bf1S93zRPcm	2026-07-23 07:58:41.861	nUkSv9mUpJCHPe5qeABo1iQf5R7mfCpY		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	\N	2026-07-16 07:58:41.861	2026-07-16 07:58:41.861
TFfA3uhlyTSa2m8LlyiViZifthK1IPtN	2026-07-30 12:33:56.149	9LTXz0nVPsfjJhtNDVNMo1XSkTCJfuHX		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-07-23 12:33:56.149	2026-07-23 12:33:56.149
ZCEKW7Q4VsztrKUnNpNxdIsDfc107WH9	2026-08-01 05:37:11.568	2tAb6sastYqhJBDvv3tTMJluQ168FVgH		Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-07-25 05:37:11.568	2026-07-25 05:37:11.568
xWAWPacg0rl1Rn3s6kXZStxJSiIMJ47r	2026-08-01 05:48:54.729	TH9WjH0qjR76izulR9RL9aTmmnbvBjkP		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-07-25 05:48:54.73	2026-07-25 05:48:54.73
BamwnoCZtHeMqyWdD0kPHJBuHX9jUGAz	2026-08-03 11:09:16.947	phvo07qMqYYg0pmvEy3s5VHZWQvF2S1D		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-07-27 11:09:16.947	2026-07-27 11:09:16.947
8eaFfhJxOR4RJwn3OMRrpOgjt0tZVN4W	2026-07-26 07:16:57.4	Zexeip4MTWQBz3FTP5QZWCZyjhroxjpm		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	\N	2026-07-15 11:16:43.783	2026-07-19 07:16:57.4
d8OzQPJhvoUd8fOroZAf78oo08MlylcX	2026-07-30 07:17:42.584	ce1JescDVMukzNapGZp6G4OvBSY8LYW7		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-07-23 07:17:42.585	2026-07-23 07:17:42.585
Kb5tsV6KDSpzuog2jaOVDAnCY6Rnn63M	2026-08-21 05:25:48.337	YhZl62HRcTZLO3b2UiglaFRFHgBKXdbP	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-08-14 05:25:48.337	2026-08-14 05:25:48.337
jA3Zygo79g4Jkd2VrlBo0AndNgRmNcJT	2026-08-29 09:22:05.988	c8T5g2cbRt5cEnCLDl7mpA2Z0aiQCL54	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	\N	2026-07-31 04:29:16.785	2026-08-22 09:22:05.988
V8MChGYGeKslisVkw3ZF6IimzxxHUCms	2026-08-24 06:55:05.967	WySGlQMS3iYelZHSqtJsd4megBPn5TC1	49.42.252.4	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	tvmUWmsmTu4QRfQn5ihKx7EwK3K5feLY	\N	2026-08-17 06:55:05.967	2026-08-17 06:55:05.967
0QG1iSNyW2HiYb8uUdt6H9L2ias9CkvO	2026-08-08 05:14:19.028	MVy1kGiHefonXArkdQF3W5As5SUNgcxG	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-07-30 10:56:32.886	2026-08-01 05:14:19.029
CsGbtxYmz5hw1l9GwEn5EXRMZjgkwDUc	2026-08-08 05:47:56.978	t67RGFowSLYYrgfZlpPM8qiWtkqsGYaq	115.246.169.242	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-07-29 12:03:07.581	2026-08-01 05:47:56.978
cApnAXTFNxlWD6f93y8JXqPzK58bE9sU	2026-08-08 05:51:19.989	mLMPRYpuYEjPg11BKxSYppXDn6Oceq1l	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-08-01 05:51:19.989	2026-08-01 05:51:19.989
PHl3DAwsGeH8nwRRwzF7cTQQjsUgVa55	2026-08-01 06:56:36.387	DwkL344tJ3zVLreTCtOa0fmiKWTJPkTH	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0	hLeMrXA5ZMH5AgfQZc8GYZm4pyrZ8dks	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	2026-08-01 05:56:36.387	2026-08-01 05:56:36.387
Up77In9ei7wpCc4ju0aRiHKylWPQhT1V	2026-08-13 11:11:15.646	9AcEDS8SxdfQm0q9naEzzmtevWb59wFE	49.42.251.25	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	\N	2026-08-01 07:51:54.748	2026-08-06 11:11:15.646
NUO6sKeHOW1xwSLVzKoKAi8kWK27M5Tz	2026-08-12 11:27:11.445	0S8ZxwQx5N5EzXMHn6kWviy20dqeH4dF	49.47.141.17	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-08-02 15:32:20.869	2026-08-05 11:27:11.445
pKyWHSqacElqRAWrzoizWUXXiyuWaWrE	2026-08-09 06:05:37.384	7ihJv9fJSUtwwYkN6YDcTX3T4zAtqRRh	49.47.141.17	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-08-02 06:05:37.384	2026-08-02 06:05:37.384
YYeYrNN9TpLCdSS3HYeD3TOIVkmdsxdG	2026-08-09 08:17:07.028	liBL0FioC7cOFGuchpJxbyks6FF7MEhl	49.47.141.17	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-08-02 08:17:07.028	2026-08-02 08:17:07.028
bkRd2dKKdm6Ee97ki4P4CoZISaF0muUH	2026-08-09 08:19:21.257	aSyC2c32VO0mgVyvafvL7yfnpET2jLSy	49.47.141.17	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-08-02 08:19:21.257	2026-08-02 08:19:21.257
ewcAqOWjN087ba7RbBFD020pLGXOqW26	2026-08-02 09:19:31.504	xuEHMZQr4Y48Dng7EUNVyPy13iak5mDO	49.47.141.17	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	2026-08-02 08:19:31.505	2026-08-02 08:19:31.505
gpH4uY9CpIcLElVYHbsq6AhxPoFe3yD9	2026-08-12 09:52:24.425	CrZqmzl2jmvTG2eSjtCTG4C1dleTfu9f	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-08-05 09:52:24.425	2026-08-05 09:52:24.425
leifYjY0H48BIdbOunRSFzQFYMM5dAmr	2026-08-05 13:12:31.148	aPJlnkMb8OQxlbgTCjnJbwGOy4vOYVVW	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0	GcZYGD8kusgbhHZGaNvTCCpZ8GISCgCc	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	2026-08-05 12:12:31.149	2026-08-05 12:12:31.149
8qbLkvZRauJy2XYMkNk6XQZqr4hTeWCm	2026-08-13 02:01:13.744	FV1UpNnG7Ud4phIlyxIMLDMz8oHoCp9D	115.246.169.242	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-08-01 11:38:02.902	2026-08-06 02:01:13.745
rg4MmnKtJJw1QUWV9WrLizaDx9XWtrxr	2026-08-15 04:36:53.795	CO2PffNSAlEM61YLgPHsZzd7cO0oTVbH	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-08-06 09:19:53.163	2026-08-08 04:36:53.795
kWQPDbpaSXvVU3MTVbZEdH6bN8xUHRQR	2026-08-15 05:10:21.645	3bJ00e6AHJxRsTixfbFJUEBj22bKcfAK	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	YLfOZqe3qKI4h1Tr1yBNA6HMNVdmBru5	\N	2026-08-08 05:10:21.645	2026-08-08 05:10:21.645
jNzVMluvo637lMA0ik3Yex3DXNn3sNze	2026-08-15 11:50:43.555	zMhp88gB5lqze8ufvBnN4hHUMCqgYUZB	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	YLfOZqe3qKI4h1Tr1yBNA6HMNVdmBru5	\N	2026-08-05 12:03:41.513	2026-08-08 11:50:43.555
hRBdOoNkMMsvkkqaEsgWA1rT1WI9F7YB	2026-08-29 05:08:46.497	z6jrIrlQw69lSBU94osTPHbWAruicxWe	115.246.169.242	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	ZNoWXYNoSG64Ofje4RtkzbJ76OCG5Ehn	\N	2026-08-22 05:08:46.497	2026-08-22 05:08:46.497
6UlxwqfWS6QbgVZUPilwTn74H6lCtIDl	2026-08-24 06:53:24.351	yxhgJ8R3Q2XVdCIrxd0taQLVxffkjdHN	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	\N	2026-08-17 06:53:24.351	2026-08-17 06:53:24.351
sa0JCB9KkmVwAiAQnRJ2mF2lpCfwmgtX	2026-08-24 06:55:53.242	Fszzbf2hHIesN6NLvrwN5lqU7Kw77Rwu	223.239.78.207	Mozilla/5.0 (iPhone; CPU iPhone OS 26_5_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/433.5.957829776 Mobile/15E148 Safari/604.1	p2e4BUq5AzMQ9f8E5flIsq3KyGG8g40e	\N	2026-08-17 06:55:53.242	2026-08-17 06:55:53.242
dMW1uRD0LHKM2LzrR74NTIsxTR791JOa	2026-08-27 05:55:35.557	rTf7l0sfh7jbOy3emD3sIiw0oUYKXALU	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	\N	2026-08-20 05:55:35.557	2026-08-20 05:55:35.557
HR11a3nhyaYymN278KFLHE8BVu3jB9cR	2026-08-27 07:24:03.673	QDIXyY1M4pj4v2xu7d81Yst2vtPbPb7A	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	\N	2026-07-30 06:09:03.977	2026-08-20 07:24:03.673
wgcDrTSw88pMUqktrYgk8lvjughH3bHg	2026-08-25 08:44:34.456	uEdlGRVKvK63LTpC2F2zFSoLFDFqw2bj	106.202.38.2	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	slG7X1kSLzd6RbuLwhwlCFfAZS7q7wwm	\N	2026-08-17 06:56:37.358	2026-08-18 08:44:34.456
hN12ND7Q1C8m77QXTR7pIwTrblBnNfxF	2026-08-26 13:26:26.289	r8TqxaeqjeKYIL2hxtxUNB6jTvVvkP9y	115.246.169.242	Mozilla/5.0 (iPhone; CPU iPhone OS 26_5_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/434.2.961627397 Mobile/15E148 Safari/604.1	kakfwAdbxtkKfV6a5amlHHc79bs7oWNC	\N	2026-08-17 06:58:13.534	2026-08-19 13:26:26.289
SQ0OxxLcaAukki52U57Ze1hHf0EmaVzQ	2026-08-28 08:40:07.454	LlJmk5KdRdq5p5KbalixXyBmuv1mT4ER	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-08-08 12:05:28.834	2026-08-21 08:40:07.454
7YrkV78E9ASHrxgJKZL8v9veGiYOd5Rc	2026-08-28 08:49:24.279	wH3uANZgDVkFvRIjEwqj3zKp2jQg3445	106.202.47.129	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	Znok1nrEYDS5L3ccWY3SjvmWbxvBkHpG	\N	2026-08-18 06:09:11.319	2026-08-21 08:49:24.279
C4jltQktD6iaLWJzmtnKJj1BpdECkF4L	2026-08-29 10:46:45.446	icjUy0K0YcwVLRcavBiG9Vsvzujw7us2	115.246.169.242	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-08-17 06:04:25.739	2026-08-22 10:46:45.446
ljtwRBNxWlRi4LWJm4duZ3IlxSiwyGM4	2026-08-28 10:28:08.449	juDwlhPYEyRWkhRkagz3d7EHJYb38PCG	49.42.97.184	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	\N	2026-08-21 10:28:08.449	2026-08-21 10:28:08.449
6bDv1CizYQxBeKoeex00rL1cRLddSF2z	2026-08-29 11:54:58.58	29EboErWvevhNvDFRWGDAejvjoXCqSLl	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	\N	2026-07-31 04:27:31.14	2026-08-22 11:54:58.58
iqdMW0mMrYIAVFjPC4CgnRKzXRLJVn1n	2026-08-30 03:59:25.85	hQprewnRZsFD5X7jCEareoFxFXunJt7d	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	\N	2026-08-23 03:59:25.85	2026-08-23 03:59:25.85
ioXB2cYpsWtVLeeLxjG4OsOYBUfaljpx	2026-08-30 04:45:35.193	n8EY3vlfiXZPpkjJv3dy4tLnuR1NWpcm	115.246.169.242	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	\N	2026-08-23 04:45:35.193	2026-08-23 04:45:35.193
vkskPH60vMoAU8FG943JuXgrizE4aNrK	2026-08-30 15:19:59.809	59CkU21vgSBzqxZ90tFywFUqOCArYEqM		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-08-23 15:19:59.809	2026-08-23 15:19:59.809
VgTqKTRiBELeMf52LKFNHS6a5Lk7Qg2M	2026-08-31 11:07:15.063	Qp2hpTWoLS37nBBxRsJvFxqtHpCSiadO		Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	\N	2026-08-24 11:07:15.063	2026-08-24 11:07:15.063
\.


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shifts (id, name, code, start_time, end_time, active, is_off_day, sort_order, created_at, updated_at) FROM stdin;
1	Leave	LV	00:00	23:59	t	t	0	2026-07-14 09:14:46.79396	2026-07-14 09:14:46.79396
5	Half Day Leave	HDLV	13:00	17:00	t	f	0	2026-07-14 09:14:46.79396	2026-07-14 09:14:46.79396
2	Morning	M	07:00	12:30	t	f	1	2026-07-14 09:14:46.79396	2026-07-14 09:14:46.79396
8	Day	D	08:00	16:00	t	f	2	2026-07-15 05:40:54.42822	2026-07-15 05:40:54.42822
4	Night	N	17:30	07:00	t	f	10	2026-07-14 09:14:46.79396	2026-07-14 09:14:46.79396
9	Day-2	D2	07:00	15:00	t	f	3	2026-08-08 12:14:17.165867	2026-08-08 12:14:17.165867
7	Day Evening	DE	10:00	18:00	t	f	5	2026-07-15 05:39:50.588678	2026-07-15 05:39:50.588678
6	Day Morning 	DM	09:00	17:00	t	f	6	2026-07-15 05:38:48.535499	2026-07-15 05:38:48.535499
3	Evening	E	12:00	18:00	t	f	7	2026-07-14 09:14:46.79396	2026-07-14 09:14:46.79396
\.


--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff (staff_id, employee_code, name, role, phone, email, salary, status, aadhar, pan, version, active, user_id, is_executive, created_at, updated_at, effective_date, employment_type, permanent_confirmation_date, employment_start_date, employment_end_date) FROM stdin;
8	EMP-ZK5CQ	Keisham Cheengwang	Executive Marketing & BD	8787539494	kcwang.keisham@gamil.com	1.00	Active	549295947591	BEDPC0738P	1	f	\N	f	2026-07-16 06:25:55.52746	2026-07-16 06:25:55.52746	\N	Permanent	\N	\N	\N
1	EMP-2KPFU	Ningthoujam Ronita Devi	HR Executive	9436637514	ningthoujamronita3876@gmail.com	1.00	Active	646410700197	CHCPD5846E	1	f	\N	f	2026-07-14 10:36:30.026557	2026-07-14 10:36:30.026557	\N	Permanent	\N	\N	\N
1	EMP-2KPFU	Ningthoujam Ronita Devi	HR Executive	9436637514	ningthoujamronita3786@gmail.com	0.00	Active	646410700197	CHCPD5846E	2	t	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	f	2026-07-14 11:09:06.573095	2026-07-14 11:09:06.573095	\N	Permanent	\N	\N	\N
19	EMP-JCUB7	Sonia Hanglem	Nursing officer 	9436015537	soniahanglem@gmail.com	1.00	Active	293031314773	APGPH9626E	1	f	\N	f	2026-07-18 06:00:00.939888	2026-07-18 06:00:00.939888	\N	Permanent	\N	\N	\N
11	EMP-HLUHR	Priyanka Laishram	Pharmacist 	8731011232	priyankalaishram2002@gmail.com	1.00	Active	838720007259	BPUPL2052P	1	f	1Dv121z8xdadYrlt8gVSvuFytyzP7KGH	f	2026-07-16 11:57:21.516579	2026-07-16 11:57:21.516579	\N	Permanent	\N	\N	\N
5	EMP-13VHJ	Khundrakpam Memtombi Devi	Account Assistant	7005249530	echanthoibi69992@gmail.com	1.00	Active	801277513454	CPNPD4092K	1	f	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	f	2026-07-14 11:46:04.77893	2026-07-14 11:46:04.77893	\N	Permanent	\N	\N	\N
5	EMP-13VHJ	Khundrakpam Memtombi Devi	Account Assistant	7005249530	echanthoibi69992@gmail.com	0.00	Active	801277513454	CPNPD4092K	2	f	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	f	2026-07-15 05:50:51.299328	2026-07-15 05:50:51.299328	\N	Permanent	\N	\N	\N
5	EMP-13VHJ	Khundrakpam Memtombi Devi	Account Assistant	7005249530	echanthoibi69992@gmail.com	0.00	Active	801277513454	CPNPD4092K	3	t	Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	f	2026-07-15 05:55:52.791184	2026-07-15 05:55:52.791184	\N	Permanent	\N	\N	\N
11	EMP-HLUHR	Priyanka Laishram	Pharmacist 	8731011232	priyankalaishram2002@gmail.com	0.00	Active	838720007259	BPUPL2052P	2	t	1Dv121z8xdadYrlt8gVSvuFytyzP7KGH	f	2026-07-16 11:59:55.343507	2026-07-16 11:59:55.343507	\N	Permanent	\N	\N	\N
3	EMP-9K0EV	Maibam Romita Devi	Account Assistant	8257984480	mromita1993@gmail.com	1.00	Active	475462791788	BNAPD7027E	1	f	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	f	2026-07-14 11:29:35.578549	2026-07-14 11:29:35.578549	\N	Permanent	\N	\N	\N
3	EMP-9K0EV	Maibam Romita Devi	Account Assistant	8257984480	mromita1993@gmail.com	0.00	Active	475462791788	BNAPD7027E	2	t	3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	f	2026-07-15 06:04:12.270202	2026-07-15 06:04:12.270202	\N	Permanent	\N	\N	\N
4	EMP-270OQ	Keithellakpam Sonilata Devi	Account Assistant	9612275202	keithellakpamsanny@gmail.com	1.00	Active	931563576867	BQYPD8354F	1	f	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	f	2026-07-14 11:42:03.230243	2026-07-14 11:42:03.230243	\N	Permanent	\N	\N	\N
4	EMP-270OQ	Keithellakpam Sonilata Devi	Account Assistant	9612275202	keithellakpamsanny@gmail.com	0.00	Active	931563576867	BQYPD8354F	2	f	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	f	2026-07-15 06:01:58.403351	2026-07-15 06:01:58.403351	\N	Permanent	\N	\N	\N
4	EMP-270OQ	Keithellakpam Sonilata Devi	Account Assistant	9612275202	keithellakpamsanny@gmail.com	0.00	Active	931563576867	BQYPD8354F	3	t	nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	f	2026-07-15 06:24:45.569175	2026-07-15 06:24:45.569175	\N	Permanent	\N	\N	\N
2	EMP-QK7O7	Ngangkham Tarunkumar Singh	Assistant Manager 	7005854401	tarunng12@gmail.com	1.00	Active	954721737049	EQAPS3786R	1	f	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	f	2026-07-14 11:05:10.015602	2026-07-14 11:05:10.015602	\N	Permanent	\N	\N	\N
2	EMP-QK7O7	Ngangkham Tarunkumar Singh	Assistant Manager 	7005854401	tarunng12@gmail.com	0.00	Active	954721737049	EQAPS3786R	2	t	tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	f	2026-07-15 06:28:17.37521	2026-07-15 06:28:17.37521	\N	Permanent	\N	\N	\N
6	EMP-CRHPY	Pinky Laishram	Nursing Superintendent 	8257804254	pinkylaishram333@gmail.com	1.00	Active	593337299532	AKXPL9016C	1	f	\N	f	2026-07-15 06:52:32.191929	2026-07-15 06:52:32.191929	\N	Permanent	\N	\N	\N
7	EMP-QK8B6	Thounaojam Sorojini Chanu	Nursing Supervisor 	8415962874	sorojini.83@gmail.com	1.00	Active	427426607628	BWVPD0321F	1	f	\N	f	2026-07-16 04:43:58.255192	2026-07-16 04:43:58.255192	\N	Permanent	\N	\N	\N
18	EMP-4PKDP	Kabrambam Yukiko	Nursing officer 	8732010705	kabrambamyukiko@gmail.com	1.00	Active	365572200124	AKKPY4093R	1	f	\N	f	2026-07-18 05:35:35.606002	2026-07-18 05:35:35.606002	\N	Permanent	\N	\N	\N
20	EMP-WRTWU	Pukhrambam Niranjala Devi	Nursing officer 	7628015260	teddypuk1234@gmail.com	1.00	Active	764896765128	EHGPD3054N	1	f	\N	f	2026-07-18 07:05:49.980971	2026-07-18 07:05:49.980971	\N	Permanent	\N	\N	\N
6	EMP-CRHPY	Pinky Laishram	INFECTION CONTROL NURSE	8257804254	pinkylaishram333@gmail.com	0.00	Active	593337299532	AKXPL9016C	2	t	hLeMrXA5ZMH5AgfQZc8GYZm4pyrZ8dks	f	2026-07-16 04:30:14.843811	2026-07-16 04:30:14.843811	\N	Permanent	\N	\N	\N
13	EMP-EQ8PY	Laiphrakpam Karuna	Operations Executive 	9612466556	karyaslaiphrakpam@gmail.com	1.00	Active	676242809622	BTDPD3793G	1	t	LmXP90ESDDr4ILDycFrWMPwdkm4V6IvL	f	2026-07-17 05:20:49.860794	2026-07-17 05:20:49.860794	\N	Permanent	\N	\N	\N
14	EMP-LIGKH	Guruaribam Rohit Kumar Sharma	Manager	7005237641	g.rohitkrs@gmail.com	1.00	Active	727868950307	BQWPS0009L	1	t	y9AwVdaV8REzaQZX08us34bF2DcMAjuR	f	2026-07-17 06:57:51.009772	2026-07-17 06:57:51.009772	\N	Permanent	\N	\N	\N
17	EMP-Q42SJ	Beishamayum Niliza Devi	Nursing Incharge 	8416095747	nilizaatom@gmail.com	1.00	Active	375200405639	DMRPD9236F	1	t	fSeIkMaNgrSXK7xgHoOJ1NOOoBDaadBO	f	2026-07-18 05:11:12.591143	2026-07-18 05:11:12.591143	\N	Permanent	\N	\N	\N
8	EMP-ZK5CQ	Keisham Cheengwang	Executive Marketing & BD	8787539494	kcwang.keisham@gamil.com	0.00	Active	549295947591	BEDPC0738P	2	t	sAgfSVGUmIXsEyM9I4qy804Gom4b0o9B	f	2026-07-16 06:26:37.264681	2026-07-16 06:26:37.264681	\N	Permanent	\N	\N	\N
26	EMP-OSJLW	Brahmacharimayum Arsia	Front  Office Executive	8729887996	arsiasharma123@gmail.com	1.00	Active	340821674297	GJFPD9396L	1	t	7I5EPuFnqqNWFwdPCfcCS5koGv0LG0b4	f	2026-07-18 11:20:48.694326	2026-07-18 11:20:48.694326	\N	Permanent	\N	\N	\N
25	EMP-LJD34	Oinam Manju	Nursing officer 	8787450867	oinammanju5@gmail.com	1.00	Active	693489548546	FQIPD1490Q	1	t	ZcetNLyDLsCFENzy8GGsifvgKo4wxlkw	f	2026-07-18 11:12:50.925096	2026-07-18 11:12:50.925096	\N	Permanent	\N	\N	\N
23	EMP-WAI36	Elangbam Tarunjit	Andrologist cum Trainee Embryologist 	9863980234	elangbamelle@gmail.com	1.00	Active	996835032557	BIPPT9956C	1	t	BRGSLp1aIioqWyKHoSsnmwx0GpHqacv5	f	2026-07-18 09:17:02.850688	2026-07-18 09:17:02.850688	\N	Permanent	\N	\N	\N
22	EMP-W6UIF	Mayengbam Chandrikamalini	Front  Office Executive	8132080329	mayengbamchandrika8@gmail.com	1.00	Active	600412676796	JKHPM0726F	1	t	slG7X1kSLzd6RbuLwhwlCFfAZS7q7wwm	f	2026-07-18 09:00:30.491812	2026-07-18 09:00:30.491812	\N	Permanent	\N	\N	\N
21	EMP-LMP7U	Tourangbam Anita Devi	Incharge 	7005785249	ruhiniarambam242@gmail.com	1.00	Active	576179912805	CRJPD8645Q	1	t	dEa53V8MYFoGbxP7GuKUptpU8Dayd0hm	f	2026-07-18 08:46:25.054153	2026-07-18 08:46:25.054153	\N	Permanent	\N	\N	\N
20	EMP-WRTWU	Pukhrambam Niranjala Devi	Nursing officer 	7628015260	teddypuk1234@gmail.com	0.00	Active	764896765128	EHGPD3054N	2	t	PsmB3B8gWSRGwQAjBW2jwPBmPcaXSLfd	f	2026-07-18 07:07:52.556097	2026-07-18 07:07:52.556097	\N	Permanent	\N	\N	\N
18	EMP-4PKDP	Kabrambam Yukiko	Nursing officer 	8732010705	kabrambamyukiko@gmail.com	0.00	Active	365572200124	AKKPY4093R	2	t	rq93SK8Zy0W7zJkpb0RACVkKbKqDQIch	f	2026-07-18 05:37:24.260785	2026-07-18 05:37:24.260785	\N	Permanent	\N	\N	\N
15	EMP-KIPUH	Bidyalaxmi Salam	Nursing officer 	8730032314	bidyalaxmisalam@gmail.com	1.00	Active	368399957697	OPWPS2965M	1	t	WuL6qppGqTBJqO5De6CP1pmELvTrkewo	f	2026-07-17 11:08:28.307406	2026-07-17 11:08:28.307406	\N	Permanent	\N	\N	\N
9	EMP-6C5SE	Robertsun Elangbam	Assistant Manager 	7005402261	robertsunelangbam2012@gmail.com	1.00	Active	820738289397	BYEPR8924H	1	t	MPvF2gvOtlVFAuZi4sZk9CFYrMSuu5wE	f	2026-07-16 07:07:30.322619	2026-07-16 07:07:30.322619	\N	Permanent	\N	\N	\N
31	EMP-UOGFL	Chungkham Nikita	Nursing officer 	9862628346	chungkhamnikita73@gmail.com	1.00	Active	641282826593	DOCPN7312R	1	f	\N	f	2026-07-19 05:48:50.047716	2026-07-19 05:48:50.047716	\N	Permanent	\N	\N	\N
41	EMP-M0QSA	Thiyam Priya	RMO/Clinical Assistant 	6297687049	thiyampriya99@gmail.com	1.00	Active	266077966510	HVGPY8625B	1	f	\N	f	2026-07-19 11:58:06.157213	2026-07-19 11:58:06.157213	\N	Permanent	\N	\N	\N
57	EMP-IJ8U7	Subhashchandra Konjengbam	General Manager 	9089383109	subhashck@gmail.com	1.00	Active	577195221227	APGPK0883A	1	t	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	f	2026-07-22 10:37:49.358996	2026-07-22 10:37:49.358996	\N	Permanent	\N	\N	\N
16	EMP-YYA7U	Ningthoujam Dhanapyari	Incharge 	9612097828	dhana.006@gmail.com	1.00	Active	219029972189	CGZPD1165J	1	t	56i2G5jlvvQ2xnyB2At4NLBaZGE8GRzM	f	2026-07-17 11:38:08.005618	2026-07-17 11:38:08.005618	\N	Permanent	\N	\N	\N
7	EMP-QK8B6	Thounaojam Sorojini Chanu	Nursing Supervisor 	8415962874	sorojini.83@gmail.com	0.00	Active	427426607628	BWVPD0321F	2	t	hzNCUhfxtIOBi8fZuYV6dNpRvXgZJEpK	f	2026-07-16 06:06:13.143199	2026-07-16 06:06:13.143199	\N	Permanent	\N	\N	\N
52	EMP-6UOH7	Kangjam Sangeeta Devi 	Nursing Incharge 	8794239560	sangeetapibaren@gmail.com	1.00	Active	373978207623	CPCPD9253F	1	t	DJffRC13mVfUWM0qLctUM3VmKTAclO1G	f	2026-07-21 06:36:26.2629	2026-07-21 06:36:26.2629	\N	Permanent	\N	\N	\N
12	EMP-53IYC	Sougrakpam Sushillo Singh	Assistant General Manager 	7005104132	sushillosougrakpam97@gmail.com	1.00	Active	471786544280	GEPPS0281N	1	t	ZaXEKiTyC2AbpYNppMK8WC8palmUoOCz	f	2026-07-16 12:37:30.415303	2026-07-16 12:37:30.415303	\N	Permanent	\N	\N	\N
29	EMP-COCRH	Maibam Sanatombi Chanu	Incharge 	9862546767	maibamsanatombi7@gmail.com	1.00	Active	831994562198	BORPC0931E	1	t	ThEHTj5EsetIHnX4yVCHWpccydwjRFQB	f	2026-07-19 04:18:14.949662	2026-07-19 04:18:14.949662	\N	Permanent	\N	\N	\N
55	EMP-5KW6J	Angom Priyakumari	Incharge 	8131826941	angompriyakumari464@gmail.com	1.00	Active	353612574628	EAKPK7706R	1	t	iWtssW4KRlqMcyyeClwWrKLMn7wNhfJn	f	2026-07-21 10:42:29.911763	2026-07-21 10:42:29.911763	\N	Permanent	\N	\N	\N
56	EMP-STP23	Aheibam Lamnganbi Chanu	Front  Office Executive	8798022829	aheibamchanu@gmail.com	1.00	Active	574142970893	CSPPC5706A	1	t	p2e4BUq5AzMQ9f8E5flIsq3KyGG8g40e	f	2026-07-21 10:53:55.252064	2026-07-21 10:53:55.252064	\N	Permanent	\N	\N	\N
54	EMP-PCX3X	Pukhrambam Anju Devi	Front  Office Executive	7005768543	anjupukhrambamnew@gmail.com	1.00	Active	794463561196	GHUPP3602J	1	t	S5Dkn2ap2N3ETY8Qnx0q95hFWe0rWXBp	f	2026-07-21 10:17:04.88254	2026-07-21 10:17:04.88254	\N	Permanent	\N	\N	\N
53	EMP-WY7IW	Derick Yambem 	OT Technician 	9863982809	derickyambem123@gmail.com	1.00	Active	308283139501	BGHPY3933L	1	t	bvVcAKHJBjjzrlj1eNFpBfkeVdJCmFbJ	f	2026-07-21 10:05:42.056346	2026-07-21 10:05:42.056346	\N	Permanent	\N	\N	\N
51	EMP-5CKI6	Oinam Sapana Devi	Nursing officer 	8257834707	sapanaoinamthoi@gmail.com	1.00	Active	576745477103	EPTPD4147D	1	t	6UsDRP2gK1LCSYm15BlTRPU9YESdKMKo	f	2026-07-21 06:13:52.127803	2026-07-21 06:13:52.127803	\N	Permanent	\N	\N	\N
50	EMP-7E6TX	Thanglendanla Dina Chiru	OT Technician 	9612784637	dina12thanglen@gmail.com	1.00	Active	892520116107	CETPC2018F	1	t	bM83dg1rAM0UVAvfTneUPRZX7snAv4vo	f	2026-07-21 05:53:40.899838	2026-07-21 05:53:40.899838	\N	Permanent	\N	\N	\N
49	EMP-KDZNF	Priyaluxmi Tongbram	Nursing officer 	8413938907	priyaluxmitongbram35532@gmail.com	1.00	Active	871865899952	BFLPT3265B	1	t	ZdelJUtCi4MIyrqsOYzlzu6qHP662fXO	f	2026-07-21 05:40:54.717157	2026-07-21 05:40:54.717157	\N	Permanent	\N	\N	\N
48	EMP-LZ46I	Moirangthem Puinapati Devi	Nursing officer 	8258892802	moirangthempuinapati@gmail.com	1.00	Active	576369210188	GIVPD2064J	1	t	4RlM0XEcby4dd3l5LcsTzWvqqXWLGiX8	f	2026-07-21 05:03:31.258648	2026-07-21 05:03:31.258648	\N	Permanent	\N	\N	\N
47	EMP-O34LM	Chongtham Melisha	Nursing officer 	8258905887	chanbiichongthamchanbi65@gamil.com	1.00	Active	917525538409	DNDPD6009R	1	t	TmMMuSm4RxwiYdi1eTGD8yBSiX4zHIdQ	f	2026-07-21 03:53:54.559979	2026-07-21 03:53:54.559979	\N	Permanent	\N	\N	\N
46	EMP-NXFG0	Rajkumari Premika Chanu	Front  Office Executive	9233661253	rajkumaripremika2000@gamil.com	1.00	Active	254629369218	CUHPC6512J	1	t	MzssomKGCJvFH4Cvn3JggrGXNDnDAj2H	f	2026-07-21 03:40:06.171835	2026-07-21 03:40:06.171835	\N	Permanent	\N	\N	\N
45	EMP-JGUYQ	Mayengbam Jayenti Devi	Nursing officer 	8414045750	mayengbamjayenti@gmail.com	1.00	Active	680506660085	HGKPD8419R	1	t	6lJNa4T9alzrd02uUbhQCtSIKt3ys1I7	f	2026-07-21 03:29:19.596781	2026-07-21 03:29:19.596781	\N	Permanent	\N	\N	\N
43	EMP-T4D95	Chandam Radharani Devi	Nursing officer 	7005569286	chandamradharani@gmail.com	1.00	Active	229766073595	FYNPD4476D	1	t	bsMHslOvNMdJcJmzosFHaZPNAUoXM4if	f	2026-07-21 02:51:44.664726	2026-07-21 02:51:44.664726	\N	Permanent	\N	\N	\N
41	EMP-M0QSA	Thiyam Priya	RMO/Clinical Assistant 	6297687049	thiyampriya99@gmail.com	0.00	Active	266077966510	ENMPP9647D	2	t	sG7rpE0Z8Wq8gXkvYZPhMc1Xw2PEeclu	f	2026-07-19 12:02:01.824128	2026-07-19 12:02:01.824128	\N	Permanent	\N	\N	\N
40	EMP-C1T7W	Khangembam Khamlangba Singh	X-Ray Technician	8787540877	khamlangba.kh@gmail.com	1.00	Active	718009768471	EHNPS3684A	1	t	xdghzjTgvlyzH98CKFlSqDqVtKxNsaV4	f	2026-07-19 11:51:01.251134	2026-07-19 11:51:01.251134	\N	Permanent	\N	\N	\N
38	EMP-YKIOC	Soram Amita Devi	RMO/Clinical Assistant 	8906134825	amitasoram36@gmail.com	1.00	Active	454454867737	DWIPD7916R	1	t	g49vlAvrPurduArcWzgovY1HZDlNMTxl	f	2026-07-19 11:14:37.643987	2026-07-19 11:14:37.643987	\N	Permanent	\N	\N	\N
37	EMP-28BMH	Nanaobi Waikhom	RMO/Clinical Assistant 	8837289371	nanaobiwaikhom29@gmail.com	1.00	Active	843350439290	AEWPW0657B	1	t	Mvwfiy9txZXzOAAYrfwnaLt96lEsUGzc	f	2026-07-19 11:01:25.598219	2026-07-19 11:01:25.598219	\N	Permanent	\N	\N	\N
36	EMP-YD47H	Menerajkini Yengkhom	RMO/Clinical Assistant 	7975286628	kiniyengkhom000@gmail.com	1.00	Active	393818444774	BEZPY5864C	1	t	6qoYlfcYwY5n6D65ABwcvuMPsO5Yx6cb	f	2026-07-19 10:51:25.81081	2026-07-19 10:51:25.81081	\N	Permanent	\N	\N	\N
35	EMP-M3783	Aribam Riya Sharma	Nursing officer 	8837217347	rjshria@gmail.com	1.00	Active	918974467506	GVJPS1107L	1	t	qHthSYs5gYaR6vgGwvqnarnNPcq2cF6l	f	2026-07-19 10:19:50.474492	2026-07-19 10:19:50.474492	\N	Permanent	\N	\N	\N
33	EMP-M578N	Heikrujam Sandhyarani Devi	Nursing officer 	7627937234	heikrujamsandhya123@gmail.com	1.00	Active	613781052931	JKMPD4602J	1	t	Oj72twF3RCSaaonS5VDoaWMnutnsMo6H	f	2026-07-19 09:04:52.009738	2026-07-19 09:04:52.009738	\N	Permanent	\N	\N	\N
32	EMP-LJ2Z7	Narmada Khomdram	Nursing officer 	8837063259	narmadakhomdram@gmail.com	1.00	Active	989414096080	HXIPK8324K	1	t	Znok1nrEYDS5L3ccWY3SjvmWbxvBkHpG	f	2026-07-19 07:37:13.683208	2026-07-19 07:37:13.683208	\N	Permanent	\N	\N	\N
30	EMP-ER0IR	Leitanthem Nanao Devi	Nursing officer 	8787682284	leitanthemnanao07@gmail.com	1.00	Active	994441204393	DNXPD9843M	1	t	ywPKfKGO0ML8NdzjqsZorbJogPj1NXDK	f	2026-07-19 05:29:06.982216	2026-07-19 05:29:06.982216	\N	Permanent	\N	\N	\N
31	EMP-UOGFL	Chungkham Nikita	Nursing officer 	9862628346	chungkhamnikita73@gmail.com	0.00	Active	641282826593	DOCPN7312R	2	t	R6h7DbBNudQ0zxU0AMxkk8JkWVKH4lFv	f	2026-07-19 05:52:20.666729	2026-07-19 05:52:20.666729	\N	Permanent	\N	\N	\N
27	EMP-Q3LBV	Samjetsabam Babysana Devi	Nursing officer 	9014304259	babysanasamjet@gmail.com	1.00	Active	735347063558	GUIPD4076B	1	t	Jp1aAIrNr5lmyBuWpBFyyprL3olHsgYR	f	2026-07-19 03:03:40.553404	2026-07-19 03:03:40.553404	\N	Permanent	\N	\N	\N
42	EMP-FQPPO	Takhenchangbam Jhansirani	Assistant Lab. Director	7005245493	janemariachinglun@gmail.com	1.00	Active	787567013619	EFSPD3288A	1	f	\N	f	2026-07-21 02:35:28.597768	2026-07-21 02:35:28.597768	\N	Permanent	\N	\N	\N
44	EMP-33QUO	Yengkhom Amarjit Meitei	OT Technician 	8787438177	amarjityengkhom098@gmail.com	1.00	Active	636823373609	FVGPM8625B	1	t	JeKpjkKNOQD0M8LM2IAjuOPrXXgZiDha	f	2026-07-21 03:15:52.863546	2026-07-21 03:15:52.863546	\N	Permanent	\N	\N	\N
39	EMP-A2LAC	Shamanduram Shunanda Devi	RMO/Clinical Assistant 	9366270729	shunanda14@gmail.com	1.00	Active	681659508571	CQPPD8049B	1	t	IdCdOWQrCJoPBnmSTG82glvQY6W1C7LL	f	2026-07-19 11:32:00.085632	2026-07-19 11:32:00.085632	\N	Permanent	\N	\N	\N
34	EMP-N9E96	Jackie Laiphrakpam	Pharmacist 	7085186393	laiphrakpam76@gamil.com	1.00	Active	328186128626	AIZPL1383L	1	t	Iu5RRoqCbs1TzGTCY602U8xrbung5QTg	f	2026-07-19 10:04:47.868798	2026-07-19 10:04:47.868798	\N	Permanent	\N	\N	\N
28	EMP-ZDCDK	Phuritshabam Premlata Devi	Assistant Incharge	8787784137	phuritsabam23@gmail.com	1.00	Active	624382597669	BMJPD4580L	1	t	rRIkKhEGpxpzgjoKcqUg8RTyxhtZWZUu	f	2026-07-19 03:55:58.876678	2026-07-19 03:55:58.876678	\N	Permanent	\N	\N	\N
24	EMP-EUYS8	Thokchom Linthoinganbi	Front  Office Executive	9366394727	linthoithokchom805@gmail.com	1.00	Active	869766332371	CJDPC3982K	1	t	wfcpIQGrsKRU1hrCkCxj29idqnSxNn9A	f	2026-07-18 11:05:01.680965	2026-07-18 11:05:01.680965	\N	Permanent	\N	\N	\N
19	EMP-JCUB7	Sonia Hanglem	Nursing officer 	9436015537	soniahanglem@gmail.com	0.00	Active	293031314773	APGPH9626E	2	t	vBWXujbcpc0s3bIoXSzYz9smtUiQB7Zz	f	2026-07-18 06:04:03.806427	2026-07-18 06:04:03.806427	\N	Permanent	\N	\N	\N
62	EMP-Z0EAY	Nongthombam Priyanki Devi	RMO/Clinical Assistant 	7005148974	priyankid65@gmail.com	1.00	Active	558177446463	GEBPD2475H	1	t	VshdvkNW6AmNIXKMBEM1inPwWbk7BN4a	f	2026-08-02 11:24:53.77117	2026-08-02 11:24:53.77117	2026-08-02	Permanent	2025-06-01		
60	EMP-FUYQP	Minakumari Athokpam	Front  Office Executive	9436836321	minaathokpam11@gmail.com	1.00	Active	905674678066	CLPPA0267B	1	t	kakfwAdbxtkKfV6a5amlHHc79bs7oWNC	f	2026-08-02 10:24:23.214089	2026-08-02 10:24:23.214089	2026-08-02	Permanent	2025-03-01		
61	EMP-JZKCT	Galina Hijam	Trainee staff Nurse 	6009031962	galinalaishram@gmail.com	1.00	Active	935582278056	FEBPD9933K	1	t	P156rgOwPYsPRQ1z37cmWWPrLvnW9ynY	f	2026-08-02 10:56:12.21698	2026-08-02 10:56:12.21698	2026-08-02	Intern		2026-06-05	2026-12-05
63	EMP-CAVSS	Naorem Shilla Devi	OT Technician 	9366995340	shillanaorem1@gmail.com	1.00	Active	740320910059	AKKPY4866G	1	t	UDgqsJfXLPFztSZvIQSYS05fcrEXp71D	f	2026-08-03 08:11:08.85927	2026-08-03 08:11:08.85927	2026-08-03	Permanent	2025-06-15		
10	EMP-032LN	Akoijam Maheshwor Singh	Assistant Manager 	7005872709	mahesakoijam.official@gmail.com	0.00	Active	362923539794	JRCPS5557Q	3	t	YLfOZqe3qKI4h1Tr1yBNA6HMNVdmBru5	f	2026-08-05 11:29:26.204518	2026-08-05 11:29:26.204518	2026-08-05	Permanent			
10	EMP-032LN	Akoijam Maheshwor Singh	Assistant Manager 	7005872709	maheshwor2014singh@gamil.com	1.00	Active	362923539794	JRCPS5557Q	1	f	\N	f	2026-07-16 09:32:45.651303	2026-07-16 09:32:45.651303	\N	Permanent	\N	\N	\N
10	EMP-032LN	Akoijam Maheshwor Singh	Assistant Manager 	7005872709	maheshwor2014singh@gamil.com	0.00	Active	362923539794	JRCPS5557Q	2	f	\N	f	2026-07-16 12:03:39.76785	2026-07-16 12:03:39.76785	\N	Permanent	\N	\N	\N
59	EMP-VVYNY	Dr. Mrinalini Konjengbam	Chief Operating Officer/Medical Superintendent 	8974010490	mrina_k@yahoo.co.in	1.00	Active	294179189591	AWKPK7734R	1	t	GcZYGD8kusgbhHZGaNvTCCpZ8GISCgCc	f	2026-08-01 11:34:08.475656	2026-08-01 11:34:08.475656	2026-08-01	Permanent			
58	EMP-XSL2D	Dr. James Elangbam	Managing Director 	9862582612	james.elangbam@gmail.com	1.00	Active	210063898823	AAGPE6417M	1	t	6c5Lb48MdG0kgFKKZIpv4a6uJtetrU5m	f	2026-08-01 10:55:07.662037	2026-08-01 10:55:07.662037	2026-08-01	Permanent	2013-01-14		
73	EMP-1P0MN	Yambem Romabati Devi	Nursing officer 	8258820964	yambemromabati@gmail.com	1.00	Active	486254202138	AXRPD8366L	1	t	W3IXn5OnScTi0oYEXkndY6je4xeECuCe	f	2026-08-07 11:56:52.840827	2026-08-07 11:56:52.840827	2026-08-07	Probation		2026-03-02	2026-09-01
72	EMP-KVW5W	Huidrom Irish Chanu	Nursing officer 	8787708320	huidromirishchanu@gmail.com	1.00	Active	596032360000	CQUPC7056A	1	t	CDrlnxvl0gz2iI92SVPG3r24lbmKuQDj	f	2026-08-07 11:46:20.319982	2026-08-07 11:46:20.319982	2026-08-07	Probation		2026-05-22	
71	EMP-SGPNA	Ningthoujam Reshmabati Chanu	Assistant Incharge	8575379460	ningthoujamreshmabati@gmail.com	1.00	Active	287033305604	BDQPC3682N	1	t	QAdA6wgcDYE7415AGv3588dCBkL8j0U2	f	2026-08-07 11:23:15.286977	2026-08-07 11:23:15.286977	2026-08-07	Permanent			
70	EMP-46TOL	Ayinao Mungkung	Nursing officer 	8413953727	ayinaomungkung@gmail.com	1.00	Active	938409798690	HKXPM3727C	1	t	RIn7m1TvxUFLcQX5qbB2qAXhsRJI2cgw	f	2026-08-07 10:35:03.488456	2026-08-07 10:35:03.488456	2026-08-07	Probation		2025-11-25	2026-05-14
69	EMP-VUFWQ	Yumkhaibam Thajamanbi Devi	Nursing officer 	6009409377	yroshlin62@gmail.com	1.00	Active	718408461460	JLEPD9648B	1	t	L3WMvTNS2mdndTCZEcVqZ9VkpVSajcdP	f	2026-08-07 10:21:51.014637	2026-08-07 10:21:51.014637	2026-08-07	Probation		2024-11-15	2025-05-15
68	EMP-9S9P0	Samsad	Nursing officer 	7628979439	samsad563@gmail.com	1.00	Active	739528871271	NLEPS6376D	1	t	WPp13AvKWw6TriCwXeH1eUAFfLmp3vqR	f	2026-08-07 09:52:21.39147	2026-08-07 09:52:21.39147	2026-08-07	Probation		2020-02-24	2020-08-25
67	EMP-E3347	Pushparani Sapam	Nursing officer 	9612886859	pushparanisapam493@gmail.com	1.00	Active	784250410996	SBRPS7240J	1	t	bZgbdSln4Oz8EiX4SSgQP2AuCZiO7FOl	f	2026-08-07 09:29:34.252206	2026-08-07 09:29:34.252206	2026-08-07	Intern		2025-08-05	2026-06-04
66	EMP-CW1WZ	Baseimayum Sajina	Nursing officer 	9774235670	sajina123xyz@gmail.com	1.00	Active	624147072553	QHWPS5922J	1	t	NAZC507s8SFupcMpw97HDToNxZhkHGvN	f	2026-08-07 08:06:41.044858	2026-08-07 08:06:41.044858	2026-08-07	Permanent	2022-02-27		
65	EMP-V11N5	Thangjam Pushparani Devi	Nursing officer 	9101658147	pushpar901@gmail.com	1.00	Active	890621753447	AYEPD9879Q	1	t	QETCIcKL3L2Dt4X2Hrd4hAH7U3DLYxtP	f	2026-08-07 06:45:18.001151	2026-08-07 06:45:18.001151	2026-08-07	Probation		2026-08-03	
64	EMP-UUOUV	MONGBIJAM SIMRAN DEVI	Nursing officer 	7005111896	mongbijamsimarandevi@gmail.com	1.00	Active	740239306355	CIRPD0591E	1	t	ls6wA2G0BeFv6mmbuaKGz6KwNEXr5PDt	f	2026-08-07 05:12:49.028937	2026-08-07 05:12:49.028937	2026-08-07	Probation		2026-08-05	
80	EMP-M4SJT	Yumnam Bidyalaxmi Devi	Customer Relationship Officer	8974897813	yumnambidyalaxmi6@gmail.com	1.00	Active	583548083529	ATUPD0667K	1	t	NYPpW8sWNDp4HrtcTacBhCKsRhAATjnu	f	2026-08-08 10:31:35.301232	2026-08-08 10:31:35.301232	2026-08-08	Permanent			
79	EMP-FMBXX	Wangkhem Mary Devi	Assistant Incharge	9366907539	salammary07@gmail.com	1.00	Active	865976600741	FFYPP6438B	1	t	zeeGZDbPGPHCscCCy3UrucGSHNAx4Q4a	f	2026-08-08 10:10:25.226995	2026-08-08 10:10:25.226995	2026-08-08	Permanent			
78	EMP-F6GM4	Aribam Priya Devi	Nursing officer 	9774035519	aribampiyabii1@gmail.com	1.00	Active	573552027906	CKEPD1978G	1	t	9XigSaxGVO8lu6KlzVrpUJewgJhOIUSq	f	2026-08-08 09:39:41.318094	2026-08-08 09:39:41.318094	2026-08-08	Probation		2024-06-17	2024-12-17
77	EMP-TBWER	Dr. Pukhrambam Nirmada	Dental Surgeon 	8256951621	nirmadapukhrambam@gmail.com	1.00	Active	302742638842	AYVPD0043K	1	t	HOuAIuQmwUNgZhFkKGsaQKajS9dWERZz	f	2026-08-08 09:00:56.054106	2026-08-08 09:00:56.054106	2026-08-08	Permanent			
75	EMP-GJQLB	Dilip Ingudam	Consultant Anaesthetist 	6909158069	diliprims@gmail.com	1.00	Active	305754853121	ABIPI9686D	1	t	ShP0rg6aeTFUUe6uCIOnemcLtaGRbzu1	f	2026-08-08 08:17:24.328904	2026-08-08 08:17:24.328904	2026-08-08	Permanent			
74	EMP-WKK02	Debika Keisham	Nursing officer 	9863081628	devikakeisham097@gmail.com	1.00	Active	343930017264	AXKPY4093R	1	t	xpzUGeQbZ5M5NBbsDUzjnTiuO6eOhocv	f	2026-08-08 06:56:13.206654	2026-08-08 06:56:13.206654	2026-08-08	Probation		2025-09-22	2026-03-31
90	EMP-15VD4	Nureda Shahni	CSSD Technician 	7005477878	shahninureda@gmail.com	1.00	Active	421658551240	KDQPS6821C	1	t	kKiWhq6S2aKO6UuY4XwPxqrjc8a8t1Lq	f	2026-08-10 05:56:29.488189	2026-08-10 05:56:29.488189	2026-08-10	Permanent			
89	EMP-6G8O8	Kshetrimayum Somi Devi	CSSD Technician 	8256917899	somidevi82569@gmail.com	1.00	Active	253044479518	BMXPD3346Q	1	t	i5gQtoQNWyOtx0W397TNVDGi29dcICk3	f	2026-08-10 05:46:28.546172	2026-08-10 05:46:28.546172	2026-08-10	Permanent			
88	EMP-PHCNQ	Hawaibam Sony Devi	Lab Technician	8787885673	hawaibamsony@gmail.com	1.00	Active	846298289472	INSPD6088L	1	t	et5IzBSiRKXV9nb7NxCa4FgPJpIZHCV9	f	2026-08-09 11:55:21.60138	2026-08-09 11:55:21.60138	2026-08-09	Permanent			
87	EMP-AF2VO	Guihiamliu Moita	Lab Technician	8414974561	guihiammoita@gmail.com	1.00	Active	689346402235	FSDPM0002A	1	t	UzN62yhXmDIolOr5lveTXMlx1HtjWbuT	f	2026-08-09 11:35:36.456758	2026-08-09 11:35:36.456758	2026-08-09	Permanent			
86	EMP-W3JM1	Irom Sangita Devi	Lab Technician	8794383660	sangitairom80@gmail.com	1.00	Active	445724725991	HZOPD7652B	1	t	37M2hvuLnOERyCrLD6Roe95886g5Icg5	f	2026-08-09 06:30:31.57239	2026-08-09 06:30:31.57239	2026-08-09	Permanent			
85	EMP-PGNEM	Irom Rupamani Devi	Lab Technician	9863179773	rupamaniirom2@gmail.com	1.00	Active	754237108937	DMIPD5821F	1	t	YnKzIEKfnfr8uEntgPnMtHHzYQ0z4LNJ	f	2026-08-09 06:13:44.102178	2026-08-09 06:13:44.102178	2026-08-09	Permanent			
84	EMP-WF6O2	Ningombam Sanatombi Devi	Lab Technician	9862924580	sanatombiningombam123@gmail.com	1.00	Active	996090687758	APOPD3447F	1	t	ipSluCETdB9k152UZqk6LC5azIl6phbG	f	2026-08-09 05:55:07.271451	2026-08-09 05:55:07.271451	2026-08-09	Permanent			
83	EMP-SRD1N	Moirangthem Bidyalaxmi Devi	Lab Technician	7005170373	moirangthemnely@gmail.com	1.00	Active	298985968726	KIVPD4034G	1	t	tvmUWmsmTu4QRfQn5ihKx7EwK3K5feLY	f	2026-08-09 05:28:16.75221	2026-08-09 05:28:16.75221	2026-08-09	Permanent			
82	EMP-KXMHO	Nongmaithem Bheigashree	Pharmacy Assistant	8798987618	bheigashreen@gmail.com	1.00	Active	387823065305	FLPPB5881K	1	t	Q41cuVZ41NsKrjn0CcFrcVtFkOEHB065	f	2026-08-09 05:03:40.144611	2026-08-09 05:03:40.144611	2026-08-09	Permanent			
81	EMP-H6FIV	Sanjita Ningombam	Customer Relationship Officer	8258021038	sanjitaningombam793@gmail.com	1.00	Active	574664954596	AYZPN9149A	1	t	oEnbRUnPCWvmKovJ1hq4JvvPnDtdmDhw	f	2026-08-09 04:48:44.933199	2026-08-09 04:48:44.933199	2026-08-09	Permanent			
76	EMP-1AO1X	Ningthoujam Rahul Singh	Pharmacist 	7005720217	bungning21@gmail.com	1.00	Active	604168280630	PTBPS8761M	1	t	e5hFadZiKpbx76qYrAzJf41CAcOHj7E5	f	2026-08-08 08:40:56.157649	2026-08-08 08:40:56.157649	2026-08-08	Probation		2026-05-08	2026-11-07
94	EMP-GTY8V	Longjam Shantipriya	Nursing officer 	7005945181	longjamshantipriya12345@gmail.com	1.00	Active	296484722788	KYUPD9294K	1	t	lp0oqGEiuiZxMqEwJ7GBMnj7jT5z2ZfP	f	2026-08-13 11:33:36.150063	2026-08-13 11:33:36.150063	2026-08-13	Permanent			
93	EMP-JVIZF	Khwairakpam Samuel Meitei	Assistant Cook	9612458421	samuelkhwairakpam873@gmail.com	1.00	Active	779244592389	JEZPM9542B	1	t	oyIxLPFQorKXgCKygLTxvglSdgfHASWk	f	2026-08-13 11:21:21.125447	2026-08-13 11:21:21.125447	2026-08-13	Permanent			
92	EMP-9XZOE	Irengbam Somokanta Singh	Inventory Associate	8732824318	irengbambungsingh@gmail.com	1.00	Active	693990815058	GGOPS1284L	1	t	zKdy6h44Fv2c8qJikShNeLTxUbYPfD9f	f	2026-08-13 06:08:27.306135	2026-08-13 06:08:27.306135	2026-08-13	Permanent			
91	EMP-CI4E2	Sanasam Bidyachandra Singh	Assistant Cook	7005281583	sanasambidyachandra17@gmail.com	1.00	Active	621692949724	EPBPS5857B	1	t	fVm6VADGB7mUkbchII4DRsFBdGvQb3KV	f	2026-08-12 11:14:34.144589	2026-08-12 11:14:34.144589	2026-08-12	Permanent			
103	EMP-X233D	Ongnam Ithoi Singh	Multi Tasking Staff	9362333784	willewilleongnam@gmail.com	1.00	Active	380303687294	BSSSD0220L	1	t	vp1HiaN5MzhX9jIU4s5v5l6POJrtel4g	f	2026-08-17 08:46:19.85448	2026-08-17 08:46:19.85448	2026-08-17	Permanent			
102	EMP-A2WBN	Ningombam Laksana Devi	Assistant Cook	8798369153	thoibisanatakhel.bam@gmail.com	1.00	Active	699552654764	HUKPD2520K	1	t	ffSm4sodxdiWv3WsjXA7Q4u91JKjtNCI	f	2026-08-17 05:15:28.285883	2026-08-17 05:15:28.285883	2026-08-17	Permanent			
101	EMP-Q71HX	Beishamayum Paris Singh	Multi Tasking Staff	9863647968	lekthabimayum@gmail.com	1.00	Active	838060545240	AKKYP0251G	1	t	ODOJ6KT7epI8QN1l8sRKNPAI9fsZY3Jo	f	2026-08-16 11:38:01.020006	2026-08-16 11:38:01.020006	2026-08-16	Permanent			
100	EMP-1CQFW	Nepram Ronald Singh	Multi Tasking Staff	6009890058	ronaldsingh630@gmail.com	1.00	Active	755299845629	UEMPS6156D	1	t	K489SeItx8Jj8HqNLfuZcFXEjGkXhtrl	f	2026-08-16 11:27:52.523998	2026-08-16 11:27:52.523998	2026-08-16	Permanent			
99	EMP-K8WIK	Champion Ongnam	Multi Tasking Staff	9863155090	championongnam7@gmail.com	1.00	Active	214498362842	AFFPO8990K	1	t	BoY661ZwRMrKnngom15QANq7zSvWGY3P	f	2026-08-16 11:17:39.990118	2026-08-16 11:17:39.990118	2026-08-16	Permanent			
98	EMP-WBBOA	Abenao Thokchom	Multi Tasking Staff	9863241356	thokchomabenao44@gmail.com	1.00	Active	318343981047	BTLPT9806N	1	t	FiZDJCLMGlgXz2pfZE2TZsFwhamfNNxm	f	2026-08-16 11:09:44.079206	2026-08-16 11:09:44.079206	2026-08-16	Permanent			
97	EMP-VOMB3	Lucia Okram	Laboratory Technician 	9863241356	luciaokram027@gmail.com	1.00	Active	926063469338	AHOPO2602B	1	t	BefrFmmjxOZmaivXvOIikvZhh9WIvlP5	f	2026-08-16 10:51:46.927833	2026-08-16 10:51:46.927833	2026-08-16	Permanent			
96	EMP-3GP17	Gaithaothoi Phaomei	Maintenance Executive 	7629034438	gaithaothoiphaomei@gmail.com	1.00	Active	671029736193	FVBPP2033R	1	t	3nw95baXeASPfwxObXaAWn0ETpRfO6zL	f	2026-08-16 07:18:09.82167	2026-08-16 07:18:09.82167	2026-08-16	Permanent			
95	EMP-TB86H	Sapam Arun Singh	Maintenance Executive 	7005920071	arunsapam22@gmail.com	1.00	Active	714698499639	IVGPS0188L	1	t	zvI44L5rXCNfCzP87UUvPzoVxa9KOYzO	f	2026-08-16 07:00:17.968045	2026-08-16 07:00:17.968045	2026-08-16	Permanent			
111	EMP-XZMSI	Naorem Jitamala Devi	Multi Tasking Staff	7085367056	nandinilaishram1973@gmail.com	1.00	Active	513133921044	BCDHP8354F	1	f	\N	f	2026-08-19 10:10:03.950592	2026-08-19 10:10:03.950592	2026-08-19	Permanent			
110	EMP-VW200	Puyam Swarnalata Devi	Multi Tasking Staff	9378113824	kabitapuyam98@gmail.com	1.00	Active	496573155672	ECZPD5079M	1	f	\N	f	2026-08-19 09:57:32.865223	2026-08-19 09:57:32.865223	2026-08-19	Permanent			
109	EMP-EXKRR	Maibam Radha Devi	Multi Tasking Staff	9856217277	kshetrimayumradha164@gmail.com	1.00	Active	392173583248	CKZPD2649P	1	f	\N	f	2026-08-19 09:45:50.552298	2026-08-19 09:45:50.552298	2026-08-19	Permanent			
112	EMP-U0VJI	Nongmaithem Pinky Devi	Office Assistant 	7085350824	nongmaithem00@gmail.com	1.00	Active	799973352899	JQOPD9538R	1	f	ZNoWXYNoSG64Ofje4RtkzbJ76OCG5Ehn	f	2026-08-19 10:42:56.690508	2026-08-19 10:42:56.690508	2026-08-19	Permanent			
113	EMP-D1497	Arubam Meekita Devi	Office Assistant 	9862819498	mikiarb6464@gmail.com	1.00	Active	940832081847	HFIPD6316G	1	f	6dRHVMDzI88xZoqERxLDev45iefATYsb	f	2026-08-19 10:59:09.552784	2026-08-19 10:59:09.552784	2026-08-19	Permanent			
107	EMP-EL9SE	Phurailatpam Bankabihari Sharma	Multi Tasking Staff	7005818974	bankab223@gmail.com	1.00	Active	488908216741	QRYPS6510Q	1	t	o2C2BqYklhIDj6HTLNB9eH3YHjP0thlT	f	2026-08-19 07:08:49.324394	2026-08-19 07:08:49.324394	2026-08-19	Permanent			
106	EMP-DJ8ME	Khoisnam Naoba Meitei	Multi Tasking Staff	9362894972	sanayanbikh703@gmail.com	1.00	Active	988205759638	KEPPM5469L	1	t	h842HTjxS0abmxIx95jyjXuBFkyZVDmT	f	2026-08-19 06:53:06.84252	2026-08-19 06:53:06.84252	2026-08-19	Permanent			
105	EMP-ZKHC1	Loitongbam Ningthemjao Singh	Multi Tasking Staff	9077655709	loitongbamsoman@gmail.com	1.00	Active	956889185584	HWNPS6067M	1	t	XatEjzz94rK2o6CbEDC7RHXwFMGgslQK	f	2026-08-19 06:40:14.87138	2026-08-19 06:40:14.87138	2026-08-19	Permanent			
104	EMP-DL74S	Soubam Sangita Chanu	Pharmacist 	7005524838	sangitachanu00@gmail.com	1.00	Active	413535869892	BEQPC5549K	1	t	pDYdEP3ZNY4wrCkYd6BKWuWtEQ3Xc7Zo	f	2026-08-19 05:24:47.78696	2026-08-19 05:24:47.78696	2026-08-19	Permanent			
108	EMP-TSB1Z	Nameirakpam Renubala Devi	Multi Tasking Staff	8413990165	sophiachanunamei@gmail.com	1.00	Active	834884340155	EILPD2424Q	1	f	\N	f	2026-08-19 07:59:58.698114	2026-08-19 07:59:58.698114	2026-08-19	Permanent			
114	EMP-9L11X	Shoibam Ibethoi Devi	Housekeeping Staff	9774879295	ibethoirk@gmail.com	1.00	Active	574246564262	CKZPD2580H	1	t	WatvV9UDwjXJnjkzFoXYuel2FfYEXFqJ	f	2026-08-20 05:39:51.795218	2026-08-20 05:39:51.795218	2026-08-20	Permanent			
109	EMP-EXKRR	Maibam Radha Devi	Housekeeping Staff	9856217277	kshetrimayumradha164@gmail.com	0.00	Active	392173583248	CKZPD2649P	2	t	VL0aV4pVwbuqzNaDS9MTFnrmeKrOy9s7	f	2026-08-20 05:22:08.140171	2026-08-20 05:22:08.140171	2026-08-19	Permanent			
110	EMP-VW200	Puyam Swarnalata Devi	Housekeeping Staff	9378113824	kabitapuyam98@gmail.com	0.00	Active	496573155672	ECZPD5079M	2	t	Do6FQfPUZcIGck5nRkeD3Zg6hODoWzEW	f	2026-08-20 05:21:41.044163	2026-08-20 05:21:41.044163	2026-08-19	Permanent			
111	EMP-XZMSI	Naorem Jitamala Devi	Housekeeping Staff	7085367056	nandinilaishram1973@gmail.com	0.00	Active	513133921044	BCDHP8354F	2	t	mjRYL3FSEEoCWgqmYCgJyRFCIQ9whtWY	f	2026-08-20 05:21:25.101784	2026-08-20 05:21:25.101784	2026-08-19	Permanent			
108	EMP-TSB1Z	Nameirakpam Renubala Devi	Housekeeping Staff	8413990165	sophiachanunamei@gmail.com	0.00	Active	834884340155	EILPD2424Q	2	t	3iz36rvfzjk5sKmQlO7YQXhNUZwYGtg2	f	2026-08-20 05:21:00.460032	2026-08-20 05:21:00.460032	2026-08-19	Permanent			
112	EMP-U0VJI	Nongmaithem Pinky Devi	Office Assistant 	7085350824	nongmaithem00@gmail.com	0.00	Active	799973352899	JQOPD9538R	2	t	ZNoWXYNoSG64Ofje4RtkzbJ76OCG5Ehn	f	2026-08-20 05:44:34.81491	2026-08-20 05:44:34.81491	2026-08-19	Permanent			
113	EMP-D1497	Arubam Meekita Devi	Office Assistant 	9862819498	mikiarb6464@gmail.com	0.00	Active	940832081847	HFIPD6316G	2	f	6dRHVMDzI88xZoqERxLDev45iefATYsb	f	2026-08-20 05:43:32.339504	2026-08-20 05:43:32.339504	2026-08-19	Permanent			
129	EMP-I5277	Kangjam Meera Devi	Pharmacist 	9774673849	meerawangkhem@gmail.com	1.00	Active	275259607454	AYFPD2392F	1	t	\N	f	2026-08-23 04:54:42.110209	2026-08-23 04:54:42.110209	2026-08-23	Permanent			
113	EMP-D1497	Arubam Meekita Devi	Office Assistant 	9862819498	mikiarb64@gmail.com	0.00	Active	940832081847	HFIPD6316G	3	t	KKxyPIend0kTphrF3L4WVkkmx69wzueZ	f	2026-08-20 05:54:25.01458	2026-08-20 05:54:25.01458	2026-08-19	Permanent			
115	EMP-8XKY9	Irom Monika Devi	Housekeeping Staff	9774737310	irommonicairommonica@gmail.com	1.00	Active	305824625014	EPKPD6578F	1	t	\N	f	2026-08-20 06:01:37.395678	2026-08-20 06:01:37.395678	2026-08-20	Permanent			
116	EMP-L1DWK	Kongkham Robita Devi	Housekeeping Staff	8731850372	kongkhamrobita@gmail.com	1.00	Active	703654581583	KTSPD5781A	1	t	\N	f	2026-08-20 06:42:21.028002	2026-08-20 06:42:21.028002	2026-08-20	Permanent			
117	EMP-F719J	Maibam Memubala Devi	Housekeeping Staff	8257033847	thokchommemubala@gmail.com	1.00	Active	542751209143	KVHPD4978N	1	t	\N	f	2026-08-20 08:34:14.657904	2026-08-20 08:34:14.657904	2026-08-20	Permanent			
118	EMP-96W48	Choudhurimayum Bama Devi	Housekeeping Staff	8794924647	bambilaimayum@gmail.com	1.00	Active	583832277436	EZHPD4689A	1	t	\N	f	2026-08-20 09:05:26.357744	2026-08-20 09:05:26.357744	2026-08-20	Permanent			
119	EMP-GBV47	Laimayum Nandini Devi	Housekeeping Staff	6009576317	sachinlaimayum71@gmail.com	1.00	Active	384842487628	DJYPD8212F	1	t	\N	f	2026-08-20 09:24:39.300871	2026-08-20 09:24:39.300871	2026-08-20	Permanent			
120	EMP-9MUIX	Chanam Sharmila Devi	Housekeeping Staff	9366641364	sharmilachanam37@gmail.com	1.00	Active	966849587293	EBKPD7847H	1	t	\N	f	2026-08-20 09:42:32.979806	2026-08-20 09:42:32.979806	2026-08-20	Permanent			
121	EMP-FA8ER	Maimom Leeyoni Chanu	Laboratory Technician 	9774494188	leeyonimaimom@gmail.com	1.00	Active	854168957479	CNFPC7250N	1	t	\N	f	2026-08-20 09:57:07.596877	2026-08-20 09:57:07.596877	2026-08-20	Permanent			
42	EMP-FQPPO	Takhenchangbam Jhansirani	Assistant Lab. Director	7005245493	janemariachinglun@gmail.com	0.00	Active	787567013619	EFSPD3288A	2	f	WryP1Jst7akboXbIH8kidnUYiEn28Dkc	f	2026-07-21 02:37:06.080922	2026-07-21 02:37:06.080922	\N	Permanent	\N	\N	\N
42	EMP-FQPPO	Takhenchangbam Jhansirani	Assistant Lab. Director	7005245493	janemariachinglun@gmail.com	0.00	Active	787567013619	EFSPD3288A	3	t	WryP1Jst7akboXbIH8kidnUYiEn28Dkc	f	2026-08-20 10:16:20.672561	2026-08-20 10:16:20.672561	2026-08-20	Permanent			
122	EMP-ECQ0R	Sagolsem Aman Singh	Multi Tasking Staff	9856475828	sagolsemaman171@gmail.com	1.00	Active	877639549071	BNAFF7027E	1	t	\N	f	2026-08-21 05:19:28.234923	2026-08-21 05:19:28.234923	2026-08-21	Probation		2026-07-15	2027-02-14
123	EMP-J3DHN	Puyam Santosh Singh	Multi Tasking Staff	9366113407	santoshpuyam31@gmail.com	1.00	Active	471402024219	SJAPS4608P	1	t	\N	f	2026-08-21 05:28:59.544032	2026-08-21 05:28:59.544032	2026-08-21	Probation		2026-07-17	2027-02-16
124	EMP-DXGZE	Kangabam Piyainu Chanu	Housekeeping Staff	8798019070	lansanakhuman3@gmail.com	1.00	Active	749309723590	BQYPC4942G	1	t	\N	f	2026-08-21 10:27:34.995406	2026-08-21 10:27:34.995406	2026-08-21	Permanent			
125	EMP-CHET6	Yoihenba Mangang Mutum	Multi Tasking Staff	9366708395	yoihenbamutum09@gmai.com	1.00	Active	816974230485	EFSPP3288A	1	t	\N	f	2026-08-21 10:37:54.160156	2026-08-21 10:37:54.160156	2026-08-21	Permanent			
126	EMP-D6359	Oinam Sushila Devi	Multi Tasking Staff	7629946627	mockykhuman123@gmail.com	1.00	Active	505526898067	BNADD7027E	1	t	\N	f	2026-08-21 10:44:18.827649	2026-08-21 10:44:18.827649	2026-08-21	Permanent			
127	EMP-QTZPR	Elangbam Komol	Multi Tasking Staff	8794912403	komol@gmail.com	1.00	Active	977879559749	EFRPS5225B	1	t	\N	f	2026-08-21 10:56:33.676148	2026-08-21 10:56:33.676148	2026-08-21	Permanent			
128	EMP-QDY0R	Braja Ram Tripura	Assistant Cook	8974985100	tokgaming20@gmail.com	1.00	Active	489092144963	EESDD3288P	1	t	\N	f	2026-08-23 04:34:52.69182	2026-08-23 04:34:52.69182	2026-08-23	Permanent			
\.


--
-- Data for Name: staff_departments; Type: TABLE DATA; Schema: public; Owner: -
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
108	58	1	16	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-01 10:55:07.692363	2026-08-01 10:55:07.692363	2026-08-01 10:55:07.692363
109	59	1	16	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-01 11:34:08.506981	2026-08-01 11:34:08.506981	2026-08-01 11:34:08.506981
110	60	1	7	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-02 10:24:23.231833	2026-08-02 10:24:23.231833	2026-08-02 10:24:23.231833
111	61	1	20	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-02 10:56:12.24363	2026-08-02 10:56:12.24363	2026-08-02 10:56:12.24363
112	62	1	13	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-02 11:24:53.812852	2026-08-02 11:24:53.812852	2026-08-02 11:24:53.812852
113	63	1	19	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-03 08:11:08.88901	2026-08-03 08:11:08.88901	2026-08-03 08:11:08.88901
114	10	3	1	1	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	Subhashchandra K	2026-08-05 11:29:26.22777	2026-08-05 11:29:26.22777	2026-08-05 11:29:26.22777
115	64	1	19	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-07 05:12:49.057552	2026-08-07 05:12:49.057552	2026-08-07 05:12:49.057552
116	65	1	19	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-07 06:45:18.029108	2026-08-07 06:45:18.029108	2026-08-07 06:45:18.029108
117	66	1	3	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-07 08:06:41.073006	2026-08-07 08:06:41.073006	2026-08-07 08:06:41.073006
118	67	1	3	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-07 09:29:34.28399	2026-08-07 09:29:34.28399	2026-08-07 09:29:34.28399
119	68	1	20	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-07 09:52:21.41694	2026-08-07 09:52:21.41694	2026-08-07 09:52:21.41694
120	69	1	20	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-07 10:21:51.047336	2026-08-07 10:21:51.047336	2026-08-07 10:21:51.047336
121	70	1	3	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-07 10:35:03.533965	2026-08-07 10:35:03.533965	2026-08-07 10:35:03.533965
122	71	1	3	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-07 11:23:15.319167	2026-08-07 11:23:15.319167	2026-08-07 11:23:15.319167
123	72	1	19	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-07 11:46:20.352448	2026-08-07 11:46:20.352448	2026-08-07 11:46:20.352448
124	73	1	8	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-07 11:56:52.898642	2026-08-07 11:56:52.898642	2026-08-07 11:56:52.898642
125	74	1	20	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-08 06:56:13.240434	2026-08-08 06:56:13.240434	2026-08-08 06:56:13.240434
126	75	1	22	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-08 08:17:24.366216	2026-08-08 08:17:24.366216	2026-08-08 08:17:24.366216
127	76	1	10	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-08 08:40:56.285078	2026-08-08 08:40:56.285078	2026-08-08 08:40:56.285078
128	77	1	3	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-08 09:00:56.079832	2026-08-08 09:00:56.079832	2026-08-08 09:00:56.079832
129	78	1	20	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-08 09:39:41.346955	2026-08-08 09:39:41.346955	2026-08-08 09:39:41.346955
130	79	1	19	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-08 10:10:25.254392	2026-08-08 10:10:25.254392	2026-08-08 10:10:25.254392
131	80	1	21	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-08 10:31:35.325156	2026-08-08 10:31:35.325156	2026-08-08 10:31:35.325156
132	81	1	21	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-09 04:48:44.962998	2026-08-09 04:48:44.962998	2026-08-09 04:48:44.962998
133	82	1	10	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-09 05:03:40.186451	2026-08-09 05:03:40.186451	2026-08-09 05:03:40.186451
134	83	1	23	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-09 05:28:16.782789	2026-08-09 05:28:16.782789	2026-08-09 05:28:16.782789
135	84	1	23	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-09 05:55:07.293478	2026-08-09 05:55:07.293478	2026-08-09 05:55:07.293478
136	85	1	23	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-09 06:13:44.13487	2026-08-09 06:13:44.13487	2026-08-09 06:13:44.13487
137	86	1	23	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-09 06:30:31.611478	2026-08-09 06:30:31.611478	2026-08-09 06:30:31.611478
138	87	1	23	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-09 11:35:36.490539	2026-08-09 11:35:36.490539	2026-08-09 11:35:36.490539
139	88	1	23	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-09 11:55:21.635684	2026-08-09 11:55:21.635684	2026-08-09 11:55:21.635684
140	89	1	9	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-10 05:46:28.577066	2026-08-10 05:46:28.577066	2026-08-10 05:46:28.577066
141	90	1	9	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-10 05:56:29.519548	2026-08-10 05:56:29.519548	2026-08-10 05:56:29.519548
142	91	1	12	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-12 11:14:34.188474	2026-08-12 11:14:34.188474	2026-08-12 11:14:34.188474
143	92	1	11	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-13 06:08:27.344661	2026-08-13 06:08:27.344661	2026-08-13 06:08:27.344661
144	93	1	12	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-13 11:21:21.15996	2026-08-13 11:21:21.15996	2026-08-13 11:21:21.15996
145	94	1	20	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-13 11:33:36.181878	2026-08-13 11:33:36.181878	2026-08-13 11:33:36.181878
146	95	1	5	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-16 07:00:18.004378	2026-08-16 07:00:18.004378	2026-08-16 07:00:18.004378
147	96	1	5	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-16 07:18:09.847346	2026-08-16 07:18:09.847346	2026-08-16 07:18:09.847346
148	97	1	23	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-16 10:51:46.959364	2026-08-16 10:51:46.959364	2026-08-16 10:51:46.959364
149	98	1	5	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-16 11:09:44.102174	2026-08-16 11:09:44.102174	2026-08-16 11:09:44.102174
150	99	1	5	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-16 11:17:40.024128	2026-08-16 11:17:40.024128	2026-08-16 11:17:40.024128
151	100	1	5	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-16 11:27:52.556079	2026-08-16 11:27:52.556079	2026-08-16 11:27:52.556079
152	101	1	5	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-16 11:38:01.055993	2026-08-16 11:38:01.055993	2026-08-16 11:38:01.055993
153	102	1	12	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-17 05:15:28.327596	2026-08-17 05:15:28.327596	2026-08-17 05:15:28.327596
154	103	1	5	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-17 08:46:19.89785	2026-08-17 08:46:19.89785	2026-08-17 08:46:19.89785
155	104	1	10	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-19 05:24:47.809056	2026-08-19 05:24:47.809056	2026-08-19 05:24:47.809056
156	105	1	5	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-19 06:40:14.918516	2026-08-19 06:40:14.918516	2026-08-19 06:40:14.918516
157	106	1	5	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-19 06:53:06.87026	2026-08-19 06:53:06.87026	2026-08-19 06:53:06.87026
158	107	1	5	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-19 07:08:49.360348	2026-08-19 07:08:49.360348	2026-08-19 07:08:49.360348
159	108	1	4	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-19 07:59:58.721971	2026-08-19 07:59:58.721971	2026-08-19 07:59:58.721971
160	109	1	4	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-19 09:45:50.594167	2026-08-19 09:45:50.594167	2026-08-19 09:45:50.594167
161	110	1	4	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-19 09:57:32.888941	2026-08-19 09:57:32.888941	2026-08-19 09:57:32.888941
162	111	1	4	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-19 10:10:03.978616	2026-08-19 10:10:03.978616	2026-08-19 10:10:03.978616
165	108	2	4	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-20 05:21:00.499453	2026-08-20 05:21:00.499453	2026-08-20 05:21:00.499453
166	111	2	4	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-20 05:21:25.136868	2026-08-20 05:21:25.136868	2026-08-20 05:21:25.136868
167	110	2	4	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-20 05:21:41.065603	2026-08-20 05:21:41.065603	2026-08-20 05:21:41.065603
168	109	2	4	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-20 05:22:08.159438	2026-08-20 05:22:08.159438	2026-08-20 05:22:08.159438
169	114	1	4	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-20 05:39:51.832909	2026-08-20 05:39:51.832909	2026-08-20 05:39:51.832909
164	113	1	7	1	Inactive	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-19 10:59:09.580572	2026-08-19 10:59:09.580572	2026-08-19 10:59:09.580572
170	113	2	24	2	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	Subhashchandra K	2026-08-20 05:43:32.38729	2026-08-20 05:43:32.38729	2026-08-20 05:43:32.38729
163	112	1	7	1	Inactive	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-19 10:42:56.718525	2026-08-19 10:42:56.718525	2026-08-19 10:42:56.718525
171	112	2	24	2	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	Subhashchandra K	2026-08-20 05:44:34.843175	2026-08-20 05:44:34.843175	2026-08-20 05:44:34.843175
172	113	3	24	2	Active	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	Subhashchandra K	2026-08-20 05:54:25.053092	2026-08-20 05:54:25.053092	2026-08-20 05:54:25.053092
173	115	1	4	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-20 06:01:37.450055	2026-08-20 06:01:37.450055	2026-08-20 06:01:37.450055
174	116	1	4	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-20 06:42:21.060434	2026-08-20 06:42:21.060434	2026-08-20 06:42:21.060434
175	117	1	4	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-20 08:34:14.681398	2026-08-20 08:34:14.681398	2026-08-20 08:34:14.681398
176	118	1	4	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-20 09:05:26.389505	2026-08-20 09:05:26.389505	2026-08-20 09:05:26.389505
177	119	1	4	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-20 09:24:39.32846	2026-08-20 09:24:39.32846	2026-08-20 09:24:39.32846
178	120	1	4	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-20 09:42:33.011498	2026-08-20 09:42:33.011498	2026-08-20 09:42:33.011498
179	121	1	23	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-20 09:57:07.629279	2026-08-20 09:57:07.629279	2026-08-20 09:57:07.629279
92	42	2	15	1	Inactive	52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	System Administrator	2026-07-21 02:37:06.096492	2026-07-21 02:37:06.096492	2026-07-21 02:37:06.096492
180	42	3	13	2	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-20 10:16:20.703428	2026-08-20 10:16:20.703428	2026-08-20 10:16:20.703428
181	122	1	5	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-21 05:19:28.261197	2026-08-21 05:19:28.261197	2026-08-21 05:19:28.261197
182	123	1	5	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-21 05:28:59.574176	2026-08-21 05:28:59.574176	2026-08-21 05:28:59.574176
183	124	1	12	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-21 10:27:35.014342	2026-08-21 10:27:35.014342	2026-08-21 10:27:35.014342
184	125	1	5	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-21 10:37:54.195585	2026-08-21 10:37:54.195585	2026-08-21 10:37:54.195585
185	126	1	24	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-21 10:44:18.855109	2026-08-21 10:44:18.855109	2026-08-21 10:44:18.855109
186	127	1	5	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-21 10:56:33.703788	2026-08-21 10:56:33.703788	2026-08-21 10:56:33.703788
187	128	1	12	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-23 04:34:52.734082	2026-08-23 04:34:52.734082	2026-08-23 04:34:52.734082
188	129	1	10	1	Active	CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	2026-08-23 04:54:42.145257	2026-08-23 04:54:42.145257	2026-08-23 04:54:42.145257
\.


--
-- Data for Name: staff_hr_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_hr_profiles (id, staff_id, staff_version, date_of_birth, gender, marital_status, blood_group, emergency_contact_name, emergency_contact_phone, current_address, permanent_address, education_history, professional_history, uan, epf_number, esi_number, date_of_joining, last_working_date, religion, nominees, mnc_registration_no, mnc_validity_upto, mmc_registration_no, mmc_validity_upto, created_at, updated_at, nationality, landmar_current_address, landmark_permanent_address, certifications, family_members) FROM stdin;
1	1	1	\N	Female	Single	\N	\N	\N	Kongpal Chanam Leikai	Kongpal Chanam Leikai	[]	[]	\N					Hinduism	[]					2026-07-14 10:36:30.135313	2026-07-14 10:36:30.135313	Indian	\N	\N	[]	[]
2	2	1	\N	Male	Married	\N	\N	\N	Khurai Konsam Leikai, Imphal East Manipur-795010	Khurai Konsam Leikai, Imphal East Manipur-795010	[{"year": "2011", "grade": "Passed", "institution": "DM College", "qualification": "Bcom"}, {"year": "2013", "grade": "A+", "institution": "National Institute of Finance and Accounts", "qualification": "Certified Professional Computer Accountant"}, {"year": "2005", "grade": "Grade B", "institution": "Computer Training Institute", "qualification": "DCA"}]	[{"to": "", "from": "", "employer": "Babina Hospitalities Pvt. Ltd.", "designation": "Senior Asst. Accountant", "responsibilities": ""}, {"to": "", "from": "", "employer": "Sky Hospital & Research Centre Pvt. Ltd", "designation": "Accountant", "responsibilities": ""}, {"to": "", "from": "", "employer": "Dhanni Hotels & Resorts Pvt. Ltd.", "designation": "Account Manager", "responsibilities": ""}]	\N			2022-11-25		Hinduism	[]					2026-07-14 11:05:10.058114	2026-07-14 11:05:10.058114	Indian	\N	\N	[]	[]
3	1	2	\N	Female	Single	\N	\N	\N	Kongpal Chanam Leikai	Kongpal Chanam Leikai	[]	[]	\N			\N	\N	Hinduism	[]					2026-07-14 11:09:06.608708	2026-07-14 11:09:06.608708	Indian	\N	\N	[]	[]
4	3	1	\N	Female	Single	\N	\N	\N	Khurai Chingangbam Leikai, Imphal East-795010	Khurai Chingangbam Leikai, Imphal East-795010	[{"year": "2010", "grade": "Third Division", "institution": "Sacred Heart School", "qualification": "HSLC"}, {"year": "2012", "grade": "First Division", "institution": "Royal Academy Of Science, Wangkhei", "qualification": "HSSLC"}, {"year": "2016", "grade": "First Division", "institution": "Biramangol College", "qualification": "Bsc. Botany Honours"}, {"year": "2024", "grade": "Grade B", "institution": "Liklam Ventures Pvt. Ltd", "qualification": "Tally Essential level I, II"}]	[]	\N			2016-06-14		Hinduism	[]					2026-07-14 11:29:35.685243	2026-07-14 11:29:35.685243	Indian	\N	\N	[]	[]
5	4	1	\N	Female	Married	\N	\N	\N	Wangkhei Khunou, Old Checkon, Imphal East	Wangkhei Khunou, Old Checkon, Imphal East	[{"year": "2005", "grade": "Passed", "institution": "NIOS", "qualification": "HSLC"}, {"year": "2007", "grade": "Passed", "institution": "Hundred Flowers Hr. Sec School", "qualification": "SSCE"}, {"year": "2010", "grade": "Second division", "institution": "GP Women's College", "qualification": "BA"}, {"year": "", "grade": "Passed", "institution": "IGNOU", "qualification": "MA"}, {"year": "2024", "grade": "Grade B", "institution": "Liklam Ventures Pvt. Ltd", "qualification": "Tally Essential Level I, II"}]	[]	\N			2013-11-20		Hinduism	[]					2026-07-14 11:42:03.363863	2026-07-14 11:42:03.363863	Indian	\N	\N	[]	[]
6	5	1	\N	Female	Married	\N	\N	\N	Sagolband, Imphal West-795001	Sagolband, Imphal West-795001	[]	[]	\N			2020-11-09		Hinduism	[]					2026-07-14 11:46:04.843649	2026-07-14 11:46:04.843649	Indian	\N	\N	[]	[]
39	5	2	\N	Female	Married	\N	\N	\N	Sagolband, Imphal West-795001	Sagolband, Imphal West-795001	[{"year": "2009", "grade": "Second Division", "institution": "K.M Blooming English School, Khangabok", "qualification": "HSLC"}, {"year": "2011", "grade": "First Division", "institution": "Vision Creative School of Science Thoubal", "qualification": "HSSLC"}, {"year": "2019", "grade": "First Division", "institution": "Kamakhya Pemton College", "qualification": "BSc. Chemistry Honours"}, {"year": "2022", "grade": "A Grade", "institution": "Swanirvar Charitable Trust, MSME", "qualification": "Advance Diploma in Financial Accounting"}, {"year": "2014", "grade": "First Division", "institution": "Tripura Board of Pharmacy Education", "qualification": "D. Pharm"}]	[{"to": "", "from": "2yrs", "employer": "Smart Medicos(Salai)", "designation": "Account Assistant", "responsibilities": ""}]	\N			\N	\N	Hinduism	[]					2026-07-15 05:50:51.426871	2026-07-15 05:50:51.426871	Indian	\N	\N	[]	[]
40	5	3	\N	Female	Married	\N	\N	\N	Sagolband, Imphal West-795001	Sagolband, Imphal West-795001	[{"year": "2009", "grade": "Second Division", "institution": "K.M Blooming English School, Khangabok", "qualification": "HSLC"}, {"year": "2011", "grade": "First Division", "institution": "Vision Creative School of Science Thoubal", "qualification": "HSSLC"}, {"year": "2019", "grade": "First Division", "institution": "Kamakhya Pemton College", "qualification": "BSc. Chemistry Honours"}, {"year": "2022", "grade": "A Grade", "institution": "Swanirvar Charitable Trust, MSME", "qualification": "Advance Diploma in Financial Accounting"}, {"year": "2014", "grade": "First Division", "institution": "Tripura Board of Pharmacy Education", "qualification": "D. Pharm"}]	[{"to": "", "from": "2yrs", "employer": "Smart Medicos(Salai)", "designation": "Account Assistant", "responsibilities": ""}]	\N			\N	\N	Hinduism	[]					2026-07-15 05:55:52.848594	2026-07-15 05:55:52.848594	Indian	\N	\N	[]	[]
41	4	2	\N	Female	Married	\N	\N	\N	Wangkhei Khunou, Old Checkon, Imphal East	Wangkhei Khunou, Old Checkon, Imphal East	[{"year": "2005", "grade": "Passed", "institution": "NIOS", "qualification": "HSLC"}, {"year": "2007", "grade": "Passed", "institution": "Hundred Flowers Hr. Sec School", "qualification": "SSCE"}, {"year": "2010", "grade": "Second division", "institution": "GP Women's College", "qualification": "BA"}, {"year": "", "grade": "Passed", "institution": "IGNOU", "qualification": "MA"}, {"year": "2024", "grade": "Grade B", "institution": "Liklam Ventures Pvt. Ltd", "qualification": "Tally Essential Level I, II"}]	[]	\N			\N	\N	Hinduism	[]					2026-07-15 06:01:58.460039	2026-07-15 06:01:58.460039	Indian	\N	\N	[]	[]
42	3	2	\N	Female	Single	\N	\N	\N	Khurai Chingangbam Leikai, Imphal East-795010	Khurai Chingangbam Leikai, Imphal East-795010	[{"year": "2010", "grade": "Third Division", "institution": "Sacred Heart School", "qualification": "HSLC"}, {"year": "2012", "grade": "First Division", "institution": "Royal Academy Of Science, Wangkhei", "qualification": "HSSLC"}, {"year": "2016", "grade": "First Division", "institution": "Biramangol College", "qualification": "Bsc. Botany Honours"}, {"year": "2024", "grade": "Grade B", "institution": "Liklam Ventures Pvt. Ltd", "qualification": "Tally Essential level I, II"}]	[]	\N			\N	\N	Hinduism	[]					2026-07-15 06:04:12.317602	2026-07-15 06:04:12.317602	Indian	\N	\N	[]	[]
43	4	3	\N	Female	Married	\N	\N	\N	Wangkhei Khunou, Old Checkon, Imphal East	Wangkhei Khunou, Old Checkon, Imphal East	[{"year": "2005", "grade": "Passed", "institution": "NIOS", "qualification": "HSLC"}, {"year": "2007", "grade": "Passed", "institution": "Hundred Flowers Hr. Sec School", "qualification": "SSCE"}, {"year": "2010", "grade": "Second division", "institution": "GP Women's College", "qualification": "BA"}, {"year": "", "grade": "Passed", "institution": "IGNOU", "qualification": "MA"}, {"year": "2024", "grade": "Grade B", "institution": "Liklam Ventures Pvt. Ltd", "qualification": "Tally Essential Level I, II"}]	[]	\N	100628737998	8200022633	\N	\N	Hinduism	[]					2026-07-15 06:24:45.636162	2026-07-15 06:24:45.636162	Indian	\N	\N	[]	[]
54	11	2	2003-02-02	Female	Single	\N	\N	\N	Keirao Bitra Makha Leikai, Imphal East -795008	Keirao Bitra Makha Leikai, Imphal East -795008	[{"year": "2018", "grade": "74%", "institution": "Brighter Academy", "qualification": "HSLC"}, {"year": "2020", "grade": "72.4%", "institution": "Comet School, Changangei", "qualification": "HSE"}, {"year": "2022", "grade": "80%", "institution": "Govt. Polytechnic, Takyel ", "qualification": "D. Pharm"}]	[{"to": "", "from": "3months", "employer": "JNIMS", "designation": "Apprentice", "responsibilities": ""}, {"to": "31/07/2024", "from": "01/06/2023", "employer": "Trevi Hospital ", "designation": "Pharmacist", "responsibilities": ""}]	\N			\N	\N	Hinduism	[]					2026-07-16 11:59:55.413988	2026-07-16 11:59:55.413988	Indian	\N	\N	[]	[]
44	2	2	\N	Male	Married	\N	\N	\N	Khurai Konsam Leikai, Imphal East Manipur-795010	Khurai Konsam Leikai, Imphal East Manipur-795010	[{"year": "2011", "grade": "Passed", "institution": "DM College", "qualification": "Bcom"}, {"year": "2013", "grade": "A+", "institution": "National Institute of Finance and Accounts", "qualification": "Certified Professional Computer Accountant"}, {"year": "2005", "grade": "Grade B", "institution": "Computer Training Institute", "qualification": "DCA"}]	[{"to": "", "from": "", "employer": "Babina Hospitalities Pvt. Ltd.", "designation": "Senior Asst. Accountant", "responsibilities": ""}, {"to": "", "from": "", "employer": "Sky Hospital & Research Centre Pvt. Ltd", "designation": "Accountant", "responsibilities": ""}, {"to": "", "from": "", "employer": "Dhanni Hotels & Resorts Pvt. Ltd.", "designation": "Account Manager", "responsibilities": ""}]	\N			\N	\N	Hinduism	[]					2026-07-15 06:28:17.440754	2026-07-15 06:28:17.440754	Indian	\N	\N	[]	[]
45	6	1	\N	Female	Single	\N	\N	\N	Porompat Thawanthaba Leikai, Imphal East	Porompat Thawanthaba Leikai, Imphal East	[{"year": "2004", "grade": "Passed", "institution": "NIOS", "qualification": "X"}, {"year": "2006", "grade": "Passed", "institution": "NIOS", "qualification": "XII"}, {"year": "2011", "grade": "Passed", "institution": "AECS Maaruti School of Nursing", "qualification": "GNM"}]	[]	\N			2013-12-11		Sanamahism	[]					2026-07-15 06:52:32.250253	2026-07-15 06:52:32.250253	Indian	\N	\N	[]	[]
46	6	2	1987-03-01	Female	Single	\N	\N	\N	Porompat Thawanthaba Leikai, Imphal East	Porompat Thawanthaba Leikai, Imphal East	[{"year": "2004", "grade": "Passed", "institution": "NIOS", "qualification": "X"}, {"year": "2006", "grade": "Passed", "institution": "NIOS", "qualification": "XII"}, {"year": "2011", "grade": "Passed", "institution": "AECS Maaruti School of Nursing", "qualification": "GNM"}]	[{"to": "10/04/2012", "from": "18/04/2011", "employer": "Gautam Hospital", "designation": "Staff Nurse, Ward", "responsibilities": ""}, {"to": "", "from": "1yr", "employer": "Suba Hospital", "designation": "Staff Nurse", "responsibilities": ""}]	\N			\N	\N	Sanamahism	[]					2026-07-16 04:30:14.880177	2026-07-16 04:30:14.880177	Indian	\N	\N	[]	[]
47	7	1	1983-05-03	Female	Married	\N	\N	\N	Singjamei Wangma Mongkhang Lambi	Singjamei Wangma Mongkhang Lambi	[{"year": "2000", "grade": "45%", "institution": "Little Rose Hr. Sc. School", "qualification": "HSLC"}, {"year": "2002", "grade": "50%", "institution": "Asem Arun Kumar Institute of Science & Technology", "qualification": "HSSLC"}, {"year": "2005", "grade": "72%", "institution": "Vijaya School of Nursing", "qualification": "GNM"}]	[{"to": "27/01/2007", "from": "29/08/2005", "employer": "Rabindranath Tagore Institute of Cardiac Science", "designation": "Staff Nurse, Ward", "responsibilities": ""}, {"to": "11/06/2009", "from": "02/02/2007", "employer": "AMRI Hospital, Kolkata", "designation": "Staff Nurse, NSITU", "responsibilities": ""}]	\N			2013-12-01		Sanamahism	[]					2026-07-16 04:43:58.314001	2026-07-16 04:43:58.314001	Indian	\N	\N	[]	[]
48	7	2	1983-05-03	Female	Married	\N	\N	\N	Singjamei Wangma Mongkhang Lambi	Singjamei Wangma Mongkhang Lambi	[{"year": "2000", "grade": "45%", "institution": "Little Rose Hr. Sc. School", "qualification": "HSLC"}, {"year": "2002", "grade": "50%", "institution": "Asem Arun Kumar Institute of Science & Technology", "qualification": "HSSLC"}, {"year": "2005", "grade": "72%", "institution": "Vijaya School of Nursing", "qualification": "GNM"}]	[{"to": "27/01/2007", "from": "29/08/2005", "employer": "Rabindranath Tagore Institute of Cardiac Science", "designation": "Staff Nurse, Ward", "responsibilities": ""}, {"to": "11/06/2009", "from": "02/02/2007", "employer": "AMRI Hospital, Kolkata", "designation": "Staff Nurse, NSITU", "responsibilities": ""}, {"to": "30/11/2013", "from": "07/12/2009", "employer": "Maroodyn(Oasis) & Research Centre", "designation": "Staff Nurse. OT", "responsibilities": ""}]	\N			\N	\N	Sanamahism	[]					2026-07-16 06:06:13.181153	2026-07-16 06:06:13.181153	Indian	\N	\N	[]	[]
49	8	1	1994-07-15	Male	Single	\N	\N	\N	Khuyathong D.M College Colony	Khuyathong D.M College Colony	[{"year": "2012", "grade": "9.2", "institution": "R.K. Mission Vidyapith Deoghar, Jharkhand", "qualification": "AISSE"}, {"year": "2017", "grade": "59.1%", "institution": "University of Delhi", "qualification": "BSc. Physics Honours"}, {"year": "2019", "grade": "64.3%", "institution": "IGNOU", "qualification": "MA Public Administration"}, {"year": "2023", "grade": "S Grade", "institution": "Pointrex", "qualification": "DCA"}]	[]	\N					Hinduism	[]					2026-07-16 06:25:55.581417	2026-07-16 06:25:55.581417	Indian	\N	\N	[]	[]
50	8	2	1994-07-15	Male	Single	\N	\N	\N	Khuyathong D.M College Colony	Khuyathong D.M College Colony	[{"year": "2012", "grade": "9.2", "institution": "R.K. Mission Vidyapith Deoghar, Jharkhand", "qualification": "AISSE"}, {"year": "2017", "grade": "59.1%", "institution": "University of Delhi", "qualification": "BSc. Physics Honours"}, {"year": "2019", "grade": "64.3%", "institution": "IGNOU", "qualification": "MA Public Administration"}, {"year": "2023", "grade": "S Grade", "institution": "Pointrex", "qualification": "DCA"}]	[]	\N			\N	\N	Hinduism	[]					2026-07-16 06:26:37.298428	2026-07-16 06:26:37.298428	Indian	\N	\N	[]	[]
51	9	1	1991-03-28	Male	Married	\N	\N	\N	Keishamthong Elangbam Leikai, Imphal East-795001	Keishamthong Elangbam Leikai, Imphal East-795001	[{"year": "2006", "grade": "54%", "institution": "Don Bosco Langjing", "qualification": "HSLC"}, {"year": "2009", "grade": "69%", "institution": "Bhaktivedanta Institute Mission School, Imphal", "qualification": "HSSLC"}, {"year": "2012", "grade": "56%", "institution": "Thanthai Hans Roever college. Tamilnadu", "qualification": "BBA"}, {"year": "2014", "grade": "58%", "institution": "Institute of professional Excellence & Management", "qualification": "MBA"}]	[{"to": "31/07/2013", "from": "10/06/2013", "employer": "Pantaloons", "designation": "Intern", "responsibilities": ""}, {"to": "", "from": "7Months", "employer": "WNS Global Services Pvt. Ltd", "designation": "Associate Operator", "responsibilities": ""}, {"to": "", "from": "", "employer": "ICICI Prodential Life Insurance", "designation": "", "responsibilities": ""}]	\N			2021-09-01		Hinduism	[]					2026-07-16 07:07:30.39217	2026-07-16 07:07:30.39217	Indian	\N	\N	[]	[]
52	10	1	1997-04-01	Male	Single	\N	\N	\N	Thoubal Wangmataba Sorok Mathak, Thoubal-795138	Thoubal Wangmataba Sorok Mathak, Thoubal-795138	[{"year": "2012", "grade": "79.6%", "institution": "Ruda Academy Thoubal", "qualification": "HSLC"}, {"year": "2014", "grade": "87%", "institution": "Somorendra Sana Royal Higher Secondary School", "qualification": "HSSLC"}, {"year": "2020", "grade": "9.37CGPA", "institution": "Assam Down Town University", "qualification": "Bsc. OT Technology"}, {"year": "2022", "grade": "8.25CGPA", "institution": "Assam Down Town Ubiversity", "qualification": "MBA in Healthcare"}, {"year": "2017", "grade": "62.5%", "institution": "Thoubal College", "qualification": "BSC. Zoology Honours"}]	[]	\N			2022-10-01		Hinduism	[]					2026-07-16 09:32:45.733033	2026-07-16 09:32:45.733033	Indian	\N	\N	[]	[]
53	11	1	2003-02-02	Female	Single	\N	\N	\N	Keirao Bitra Makha Leikai, Imphal East -795008	Keirao Bitra Makha Leikai, Imphal East -795008	[{"year": "2018", "grade": "74%", "institution": "Brighter Academy", "qualification": "HSLC"}, {"year": "2020", "grade": "72.4%", "institution": "Comet School, Changangei", "qualification": "HSE"}, {"year": "2022", "grade": "80%", "institution": "Govt. Polytechnic, Takyel ", "qualification": "D. Pharm"}]	[{"to": "", "from": "3months", "employer": "JNIMS", "designation": "Apprentice", "responsibilities": ""}, {"to": "31/07/2024", "from": "01/06/2023", "employer": "Trevi Hospital ", "designation": "Pharmacist", "responsibilities": ""}]	\N			2024-08-01		Hinduism	[]					2026-07-16 11:57:21.649959	2026-07-16 11:57:21.649959	Indian	\N	\N	[]	[]
55	10	2	1997-04-01	Male	Single	\N	\N	\N	Thoubal Wangmataba Sorok Mathak, Thoubal-795138	Thoubal Wangmataba Sorok Mathak, Thoubal-795138	[{"year": "2012", "grade": "79.6%", "institution": "Ruda Academy Thoubal", "qualification": "HSLC"}, {"year": "2014", "grade": "87%", "institution": "Somorendra Sana Royal Higher Secondary School", "qualification": "HSSLC"}, {"year": "2020", "grade": "9.37CGPA", "institution": "Assam Down Town University", "qualification": "Bsc. OT Technology"}, {"year": "2022", "grade": "8.25CGPA", "institution": "Assam Down Town Ubiversity", "qualification": "MBA in Healthcare"}, {"year": "2017", "grade": "62.5%", "institution": "Thoubal College", "qualification": "BSC. Zoology Honours"}]	[]	\N			\N	\N	Hinduism	[]					2026-07-16 12:03:39.806774	2026-07-16 12:03:39.806774	Indian	\N	\N	[]	[]
56	12	1	1991-02-01	Male	Single	\N	\N	\N	Thoubal Awang Leikai, Thoubal-795138	Thoubal Awang Leikai, Thoubal-795138	[{"year": "2017", "grade": "A Grade", "institution": "Sikim Manipal University", "qualification": "MHA"}, {"year": "2015", "grade": "Second Division", "institution": "", "qualification": "B.A"}, {"year": "2011", "grade": "First Division", "institution": "Vedavyas Institute of Medical & Surgical Technology", "qualification": "DOTT"}, {"year": "2008", "grade": "Second Division", "institution": "Somarendra Sana Royal Hr. Sec. School", "qualification": "SSE"}, {"year": "2006", "grade": "Second Division", "institution": "Anandapurna School, Thoubal", "qualification": "HSLC"}]	[{"to": "19/10/2022", "from": "10/08/2017", "employer": "Jivan Hospital , Kakching", "designation": "Administrative", "responsibilities": ""}, {"to": "", "from": "", "employer": "", "designation": "", "responsibilities": ""}]	\N			2022-10-22		Hinduism	[]					2026-07-16 12:37:30.467579	2026-07-16 12:37:30.467579	Indian	\N	\N	[]	[]
57	13	1	1986-02-06	Female	Married	\N	\N	\N	Takyel Khongbal, Maning Leikai- Langjing Achouba , Imphal west-795113	Takyel Khongbal, Maning Leikai- Langjing Achouba , Imphal west-795113	[{"year": "2001", "grade": "40%", "institution": "Irilbung High School", "qualification": "HSLC"}, {"year": "2004", "grade": "48%", "institution": "Standard College", "qualification": "HSE"}, {"year": "2007", "grade": "72%", "institution": "SIMS Group of Institution(Vijaya)", "qualification": "GNM"}, {"year": "2013", "grade": "78%", "institution": "Shirimanta Sangkar Deva University of Health Sciences", "qualification": "PB BSc. Nursing"}]	[{"to": "", "from": "One Year", "employer": "Poona Hospital and Research Centre", "designation": "Jr. Nursing Officer", "responsibilities": ""}, {"to": "", "from": "One Year", "employer": "Imphal Hospital", "designation": "Ward Junior Nursing", "responsibilities": ""}, {"to": "", "from": "One Year", "employer": "Srimanta Sankardeva Hospital & Research", "designation": "Ward In-Charge", "responsibilities": ""}]	\N	100628934463	8200007070	2013-11-20		Sanamahism	[]	MNC: 1282	2025-03-31			2026-07-17 05:20:49.978831	2026-07-17 05:20:49.978831	Indian	\N	\N	[]	[]
58	14	1	1978-02-15	Male	Married	\N	\N	\N	Khagempalli Pankha, Lane 1, Near Huidrom Leikai Lairembi, Imphal West-795001	Khagempalli Pankha, Lane 1, Near Huidrom Leikai Lairembi, Imphal West-795001	[{"year": "1994", "grade": "57.83%", "institution": "St. Joseph's High School", "qualification": "HSLC"}, {"year": "1996", "grade": "61.8%", "institution": "D.M College of Science", "qualification": "HSE"}, {"year": "2000", "grade": "66.33%", "institution": "D.M College of Science", "qualification": "TDC Botany Honours"}, {"year": "2005", "grade": "56.50%", "institution": "Banglore University", "qualification": "MBA, Marketing & Human Resources"}]	[{"to": "", "from": "8Months", "employer": "L. Kulabidhu Singh & CO. Godrej Dealer-FMCD", "designation": "Asst. Manager. Sales", "responsibilities": ""}, {"to": "", "from": "3Years 7Months", "employer": "Babina Diagnostics ", "designation": "Assistant Manager Operations", "responsibilities": ""}, {"to": "", "from": "9 Year 4Months", "employer": "Helwlett Packard(HP) Enterprise", "designation": "Bangalore University", "responsibilities": ""}]	\N			2022-10-01		Hinduism	[]					2026-07-17 06:57:51.087292	2026-07-17 06:57:51.087292	Indian	\N	\N	[]	[]
59	15	1	2004-03-27	Female	Single	\N	\N	\N	Wangkhei Angom Leikai Near Wal Club	Wangkhei Angom Leikai Near Wal Club	[{"year": "2019", "grade": "First Division", "institution": "Shishu Nistha Nikethan", "qualification": "HSLC"}, {"year": "2021", "grade": "First Division", "institution": "Ananda Singh Higher Secondary", "qualification": "HSE"}, {"year": "2026", "grade": "", "institution": "Shija Academy of Nursing", "qualification": "BSc. Nursing"}]	[]	\N			2026-05-18		Hinduism	[]					2026-07-17 11:08:28.369738	2026-07-17 11:08:28.369738	Indian	\N	\N	[]	[]
60	16	1	1996-12-02	Male	Single	\N	\N	\N	Khurai Kongpal Laishram Leikai - Imphal East-795010	Khurai Kongpal Laishram Leikai - Imphal East-795010	[{"year": "2012", "grade": "53.6%", "institution": "Khurai Popular High School", "qualification": "HSLC"}, {"year": "2014", "grade": "58.8%", "institution": "T.G Hr Sec School", "qualification": "HSE"}, {"year": "2018", "grade": "71%", "institution": "Kangleipak Medical & Nursing Institution", "qualification": "BSc. Nursing"}]	[]	\N			2019-04-17		Hinduism	[]					2026-07-17 11:38:08.140393	2026-07-17 11:38:08.140393	Indian	\N	\N	[]	[]
61	17	1	1991-03-25	Female	Married	\N	\N	\N	Khongman Zone IV, Imphal East-795008	Khongman Zone IV, Imphal East-795008	[{"year": "2008", "grade": "Passed", "institution": "NIOS", "qualification": "HSLC"}, {"year": "2010", "grade": "Passed", "institution": "Kanan Devi Memorial School, Imphal", "qualification": "HSE"}, {"year": "2013", "grade": "Second division", "institution": "Kangleipak Medical & Nursing Institution", "qualification": "GNM"}]	[{"to": "10/05/2014", "from": "10/05/2013", "employer": "Suba Hospital", "designation": "Trainee Nurse", "responsibilities": ""}]	\N		8200017075	2014-06-23		Hinduism	[]					2026-07-18 05:11:12.64478	2026-07-18 05:11:12.64478	Indian	\N	\N	[]	[]
62	18	1	1992-03-06	Female	Married	\N	\N	\N	Luwangsangbam Awang Leikai, Imphal East	Luwangsangbam Awang Leikai, Imphal East	[{"year": "2007", "grade": "55.4%", "institution": "Grace Academy School", "qualification": "HSLC"}, {"year": "2009", "grade": "60.6%", "institution": "Damdei Christian College", "qualification": "HSE"}, {"year": "2014", "grade": "64.20%", "institution": "K.T.G College of Nursing", "qualification": "BSc. Nursing"}]	[{"to": "20/01/2015", "from": "25/10/2013", "employer": "Sunrise Hospital Gurgoan", "designation": "Nursing Officer", "responsibilities": ""}, {"to": "30/08/2017", "from": "04/09/2015", "employer": "Goyal Hospital, Delhi", "designation": "Nursing Officer", "responsibilities": ""}, {"to": "01/08/2025", "from": "04/07/24", "employer": "Hitachi MGRM NET", "designation": "Tele-Medicine Staff", "responsibilities": ""}]	\N			2026-06-08		Hinduism	[{"name":"Laikhuram Prasanjit","percentage":100,"relationship":"Spouse"}]					2026-07-18 05:35:35.676183	2026-07-18 05:35:35.676183	Indian	\N	\N	[]	[]
63	18	2	1992-03-06	Female	Married	\N	\N	\N	Luwangsangbam Awang Leikai, Imphal East	Luwangsangbam Awang Leikai, Imphal East	[{"year": "2007", "grade": "55.4%", "institution": "Grace Academy School", "qualification": "HSLC"}, {"year": "2009", "grade": "60.6%", "institution": "Damdei Christian College", "qualification": "HSE"}, {"year": "2014", "grade": "64.20%", "institution": "K.T.G College of Nursing", "qualification": "BSc. Nursing"}]	[{"to": "20/01/2015", "from": "25/10/2013", "employer": "Sunrise Hospital Gurgoan", "designation": "Nursing Officer", "responsibilities": ""}, {"to": "30/08/2017", "from": "04/09/2015", "employer": "Goyal Hospital, Delhi", "designation": "Nursing Officer", "responsibilities": ""}, {"to": "01/08/2025", "from": "04/07/24", "employer": "Hitachi MGRM NET", "designation": "Tele-Medicine Staff", "responsibilities": ""}]	\N			\N	\N	Hinduism	[{"name":"Laikhuram Prasanjit","percentage":100,"relationship":"Spouse"}]					2026-07-18 05:37:24.347998	2026-07-18 05:37:24.347998	Indian	\N	\N	[]	[]
64	19	1	1994-03-15	Female	Married	\N	\N	\N	Pungdongbam Makha Leikai- Imphal East	Pungdongbam Makha Leikai- Imphal East	[{"year": "2010", "grade": "Third Division", "institution": "Khongjom Standard English School", "qualification": "HSLC"}, {"year": "2012", "grade": "Second Division", "institution": "Brajalal Institute of Science", "qualification": "HSE"}, {"year": "2016", "grade": "Passed", "institution": "Shija Academy of Nursing", "qualification": "GNM"}, {"year": "2018", "grade": "Passed", "institution": "Arya College of Nursing, Guwahati", "qualification": "PB BSc. Nursing"}]	[{"to": "18/05/2020", "from": "25/09/2018", "employer": "GNRC Ltd, Dispur, Guwahati", "designation": "Staff Nurse, SICU", "responsibilities": ""}, {"to": "16/02/21", "from": "03/10/2020", "employer": "Imphal Heart Institute, Imphal West", "designation": "Staff Nurse, ICCU", "responsibilities": ""}]	\N			2025-08-07		Hinduism	[{"name":"Khaidem Maipaksana","percentage":100,"relationship":"Spouse"}]					2026-07-18 06:00:00.982788	2026-07-18 06:00:00.982788	Indian	\N	\N	[]	[]
65	19	2	1994-03-15	Female	Married	\N	\N	\N	Pungdongbam Makha Leikai- Imphal East	Pungdongbam Makha Leikai- Imphal East	[{"year": "2010", "grade": "Third Division", "institution": "Khongjom Standard English School", "qualification": "HSLC"}, {"year": "2012", "grade": "Second Division", "institution": "Brajalal Institute of Science", "qualification": "HSE"}, {"year": "2016", "grade": "Passed", "institution": "Shija Academy of Nursing", "qualification": "GNM"}, {"year": "2018", "grade": "Passed", "institution": "Arya College of Nursing, Guwahati", "qualification": "PB BSc. Nursing"}]	[{"to": "18/05/2020", "from": "25/09/2018", "employer": "GNRC Ltd, Dispur, Guwahati", "designation": "Staff Nurse, SICU", "responsibilities": ""}, {"to": "16/02/21", "from": "03/10/2020", "employer": "Imphal Heart Institute, Imphal West", "designation": "Staff Nurse, ICCU", "responsibilities": ""}]	\N			\N	\N	Hinduism	[{"name":"Khaidem Maipaksana","percentage":100,"relationship":"Spouse"}]	MNC-13405/21	2026-12-27			2026-07-18 06:04:03.858538	2026-07-18 06:04:03.858538	Indian	\N	\N	[]	[]
66	20	1	1999-01-28	Female	Single	\N	\N	\N	Lilong Chajing Chingkhong Pukhri Achouba Mapal, Imphal West-795130	Lilong Chajing Chingkhong Pukhri Achouba Mapal, Imphal West-795130	[]	[]	\N			2022-01-10		Hinduism	[]					2026-07-18 07:05:50.105484	2026-07-18 07:05:50.105484	Indian	\N	\N	[]	[]
67	20	2	1999-01-28	Female	Single	\N	\N	\N	Lilong Chajing Chingkhong Pukhri Achouba Mapal, Imphal West-795130	Lilong Chajing Chingkhong Pukhri Achouba Mapal, Imphal West-795130	[{"year": "2020", "grade": "Passed", "institution": "International Hospital College of Nursing, Guwahati", "qualification": "BSc. Nursing"}]	[]	\N			\N	\N	Hinduism	[]					2026-07-18 07:07:52.593999	2026-07-18 07:07:52.593999	Indian	\N	\N	[]	[]
68	21	1	1987-02-03	Female	Married	\N	\N	\N	Naoremthong Laishram Leirak	Naoremthong Laishram Leirak	[{"year": "2002", "grade": "Passed", "institution": "Kodompoki Standard High School", "qualification": "HSLC"}, {"year": "2004", "grade": "First Division", "institution": "Aditya Sr. Sec. School, Uttam Nagar, Delhi", "qualification": "HSE"}, {"year": "2010", "grade": "Passed", "institution": "Kavuri Subha Rao School of Nursimg, Guntur", "qualification": "GNM"}]	[{"to": "21/11/2013", "from": "13/10/2010", "employer": "Sunder Lal Jain Charitable Hospital", "designation": "Staff Nurse, CCU", "responsibilities": ""}]	\N			2015-01-22		Hinduism	[]					2026-07-18 08:46:25.126579	2026-07-18 08:46:25.126579	Indian	\N	\N	[]	[]
69	22	1	2003-03-07	Female	Single	\N	\N	\N	Keishamthong Elangbam Leikai, Imphal West-795001	Keishamthong Elangbam Leikai, Imphal West-795001	[{"year": "2018", "grade": "Passed", "institution": "R.K. Sanatombi Devi Vidyala", "qualification": "HSLC"}, {"year": "2020", "grade": "Passed", "institution": "R.K Sanatombi Devi Vidyala", "qualification": "SSCE"}, {"year": "2023", "grade": "Passed", "institution": "Imphal College", "qualification": "B.A Geography Honours"}]	[{"to": "", "from": "One Year", "employer": "Assam Down Town University, Counsel, Keishampat", "designation": "Front Desk", "responsibilities": ""}]	\N			2026-06-01		Hinduism	[]					2026-07-18 09:00:30.569115	2026-07-18 09:00:30.569115	Indian	\N	\N	[]	[]
70	23	1	1999-12-30	Male	Single	\N	\N	\N	Moidangpok Khunou	Moidangpok Khunou	[{"year": "2015", "grade": "56%", "institution": "Brighter Academy", "qualification": "HSLC"}, {"year": "2017", "grade": "53.8%", "institution": "Johnstone Higher Secondary School", "qualification": "HSE"}, {"year": "2020", "grade": "83.5%", "institution": "Oriental College", "qualification": "BSc.  Botany Honours"}, {"year": "2023", "grade": "63.04%", "institution": "Manipur University", "qualification": "MSc. Biotechnology"}, {"year": "2026", "grade": "64%", "institution": "Sri Siddhartha Academy of Higher Education, Tumkur", "qualification": "Fellowship in Embryology"}]	[]	\N			2026-06-01		Hinduism	[]					2026-07-18 09:17:02.922881	2026-07-18 09:17:02.922881	Indian	\N	\N	[]	[]
71	24	1	2001-03-02	Female	Single	\N	\N	\N	Wangkhei Thangapat Mapal	Wangkhei Thangapat Mapal	[{"year": "2017", "grade": "Second Division", "institution": "Nongpok Maheikol School", "qualification": "HSLC"}, {"year": "2019", "grade": "First Division", "institution": "Pioneer Academy", "qualification": "HSE"}, {"year": "2023", "grade": "First Division", "institution": "G.P Women's College", "qualification": "Bsc. Botany Honours"}]	[]	\N			2026-06-08		Hinduism	[]					2026-07-18 11:05:01.736597	2026-07-18 11:05:01.736597	Indian	\N	\N	[]	[]
72	25	1	1998-03-01	Female	Single	\N	\N	\N	Thanga Chingkha	Thanga Chingkha	[{"year": "2013", "grade": "Second Division", "institution": "Children Model Academy Thanga", "qualification": "HSLC"}, {"year": "2015", "grade": "Passed", "institution": "Moirang Multipurpose Hr. Sec", "qualification": "HSE"}, {"year": "2021", "grade": "Passed", "institution": "MSB College of Nursing", "qualification": "BSc. Nursing"}]	[]	\N			2024-08-03		Hinduism	[]	MNC-15086/23				2026-07-18 11:12:51.00188	2026-07-18 11:12:51.00188	Indian	\N	\N	[]	[]
73	26	1	2005-07-30	Female	Single	\N	\N	\N	Wangkhei Pukhrambam Leirak	Wangkhei Pukhrambam Leirak	[{"year": "2021", "grade": "50%", "institution": "St. Sebestian High School", "qualification": "HSLC"}, {"year": "2023", "grade": "55%", "institution": "T.G Hr Sec School", "qualification": "HSE"}]	[]	\N			2026-06-01		Hinduism	[]					2026-07-18 11:20:48.808546	2026-07-18 11:20:48.808546	Indian	\N	\N	[]	[]
74	27	1	1997-03-23	Female	Single	\N	\N	\N	Thangapat Mapal Palace Compound	Thangapat Mapal Palace Compound	[{"year": "2013", "grade": "Passed", "institution": "MM Higher Secondary School", "qualification": "HSLC"}, {"year": "2016", "grade": "Passed", "institution": "Kanan Devi Memorial School, Imphal", "qualification": "HSE"}, {"year": "2020", "grade": "Passed", "institution": "SIMS Group of Institution, Guntur, Andra Pradesh", "qualification": "BSc. Nursing"}]	[{"to": "", "from": "6months", "employer": "Amaravathi Hospital, Andra Pradesh", "designation": "Intern", "responsibilities": ""}]	\N			2021-09-16		Hinduism	[]					2026-07-19 03:03:40.666774	2026-07-19 03:03:40.666774	Indian	\N	\N	[]	[]
86	38	1	1994-03-30	Female	Married	\N	\N	\N	Wangkhei Hijam Leirak, Imphal East-795005	Wangkhei Hijam Leirak, Imphal East-795005	[{"year": "2009", "grade": "Second Division", "institution": "St. George High School", "qualification": "HSLC"}, {"year": "2011", "grade": "First Division", "institution": "Pioneer Academy", "qualification": "HSSLC"}, {"year": "2019", "grade": "First Division", "institution": "Birbhum Vevekananda Homeopathy Medical College & Hospital, West Bengal", "qualification": "BHMS"}, {"year": "2024", "grade": "First Division", "institution": "Sai Institute of Paramedical & Allied Science, Dehradun", "qualification": "Master in Public Health"}]	[]	\N			2020-10-01		Hinduism	[]					2026-07-19 11:14:37.694522	2026-07-19 11:14:37.694522	Indian	\N	\N	[]	[]
75	28	1	1987-01-02	Male	Married	\N	\N	\N	Samurou- Imphal West	Samurou- Imphal West	[{"year": "2002", "grade": "Passed", "institution": "Right Step English School", "qualification": "HSLC"}, {"year": "2004", "grade": "Passed", "institution": "Presidency College", "qualification": "HSE"}, {"year": "2009", "grade": "Passed", "institution": "Sri Uma Maheshwara School of Nursing, Kurnool", "qualification": "GNM"}]	[{"to": "14/11/2010", "from": "14/04/2009", "employer": "AMRI Hospital Kolkata", "designation": "Staff Nurse, Ward", "responsibilities": ""}, {"to": "15/03/2014", "from": "28/11/2011", "employer": "Peerless Hospital & B.K. Roy Research Centre", "designation": "Staff Nurse, ITU", "responsibilities": ""}]	\N			2014-09-23		Hinduism	[{"name":"Yanglem Rekison","percentage":100,"relationship":"Spouse"}]					2026-07-19 03:55:58.91977	2026-07-19 03:55:58.91977	Indian	\N	\N	[]	[]
76	29	1	1981-02-01	Female	Single	\N	\N	\N	Keirao Wangkhem, Imphal East-795008	Keirao Wangkhem, Imphal East-795008	[{"year": "1999", "grade": "Passed", "institution": "Usha Bhavan High School", "qualification": "HSLC"}, {"year": "2001", "grade": "Passed", "institution": "Western College", "qualification": "HSE"}, {"year": "2004", "grade": "Passed", "institution": "Chaitany School of Nursing", "qualification": "GNM"}]	[{"to": "30/09/2008", "from": "01/09/2004", "employer": "Apollo", "designation": "Staff Nurse, Emergency", "responsibilities": ""}, {"to": "04/06/2013", "from": "12/10/2008", "employer": "AMRI Hospital, Kolkata", "designation": "ICCU", "responsibilities": ""}]	\N			2014-04-01		Hinduism	[]					2026-07-19 04:18:14.994921	2026-07-19 04:18:14.994921	Indian	\N	\N	[]	[]
77	30	1	1981-11-05	Female	Widowed	\N	\N	\N	Keishamthong Ahanthem Leikai, Imphal West-795001	Keishamthong Ahanthem Leikai, Imphal West-795001	[{"year": "1998", "grade": "Passed", "institution": "Little Rose Hr. Sc. School", "qualification": "HSLC"}, {"year": "2001", "grade": "Passed", "institution": "Ng. Mani College", "qualification": "HSE"}, {"year": "2004", "grade": "Passed", "institution": "Vijiya School of Nursing, Andhra Pradesh", "qualification": "GNM"}]	[{"to": "30/06/2005", "from": "01/09/2004", "employer": "Sahi Hospital", "designation": "Staff Nurse", "responsibilities": ""}, {"to": "27/03/2009", "from": "29/05/2007", "employer": "AMRI Hospital, Kolkata", "designation": "Staff Nurse, ITU", "responsibilities": ""}, {"to": "21/04/2013", "from": "7/05/2012", "employer": "Peerless Hospital and B.K. Roy Research Centre", "designation": "Staff Nurse", "responsibilities": ""}, {"to": "13/04/2006", "from": "13/01/2006", "employer": "Shija Hospitals And Research Institute", "designation": "Apprentice Nurse", "responsibilities": ""}]	\N			2014-11-24		Hinduism	[]					2026-07-19 05:29:07.056398	2026-07-19 05:29:07.056398	Indian	\N	\N	[]	[]
78	31	1	2001-03-14	Female	Single	\N	\N	\N	Ghari Awang Leikai, Imphal  West-795001	Ghari Awang Leikai, Imphal  West-795001	[{"year": "2016", "grade": "47%", "institution": "Kodompokpi Standard High School", "qualification": "HSLC"}, {"year": "2018", "grade": "44.3%", "institution": "HRD Academy Ghari", "qualification": "HSE"}, {"year": "2021", "grade": "Passed", "institution": "Nightingle Nursing Institute, Porompat ", "qualification": "GNM"}]	[{"to": "15/12/2021", "from": "15/11/2021", "employer": "Chamber of Commerce Medical Care and Reaserch Centre", "designation": "", "responsibilities": ""}]	\N			2023-10-05		Hinduism	[]	MNC-14576/22				2026-07-19 05:48:50.105987	2026-07-19 05:48:50.105987	Indian	\N	\N	[]	[]
79	31	2	2001-03-14	Female	Single	\N	\N	\N	Ghari Awang Leikai, Imphal  West-795001	Ghari Awang Leikai, Imphal  West-795001	[{"year": "2016", "grade": "47%", "institution": "Kodompokpi Standard High School", "qualification": "HSLC"}, {"year": "2018", "grade": "44.3%", "institution": "HRD Academy Ghari", "qualification": "HSE"}, {"year": "2021", "grade": "Passed", "institution": "Nightingle Nursing Institute, Porompat ", "qualification": "GNM"}]	[{"to": "15/12/2021", "from": "15/11/2021", "employer": "Chamber of Commerce Medical Care and Reaserch Centre", "designation": "", "responsibilities": ""}]	\N			\N	\N	Hinduism	[]	MNC-14576/22				2026-07-19 05:52:20.707521	2026-07-19 05:52:20.707521	Indian	\N	\N	[]	[]
80	32	1	2000-04-01	Female	Single	\N	\N	\N	Palace Compound, Thangapat Mapal, Imphal East-795001	Palace Compound, Thangapat Mapal, Imphal East-795001	[{"year": "2015", "grade": "56%", "institution": "Wangkhei High School", "qualification": "HSLC"}, {"year": "2017", "grade": "68%", "institution": "Pioneer Academy", "qualification": "HSE"}, {"year": "2022", "grade": "70%", "institution": "Tirumala College of Nursing", "qualification": "BSc. Nursing"}]	[{"to": "", "from": "2 Months", "employer": "Rainbow Children Hospital, Hydrabad", "designation": "Staff Nurse NICU", "responsibilities": ""}, {"to": "", "from": "6Months", "employer": "Tirumala Hospital", "designation": "Intern", "responsibilities": ""}]	\N			2022-12-01		Hinduism	[]	MNC-15565/23				2026-07-19 07:37:13.744481	2026-07-19 07:37:13.744481	Indian	\N	\N	[]	[]
81	33	1	2001-12-16	Female	Single	\N	\N	\N	Andro Mamang Leikai, Imphal East-795149	Andro Mamang Leikai, Imphal East-795149	[{"year": "2017", "grade": "67%", "institution": "K.M Blooming Hr. Sec. School, Khangabok", "qualification": "HSLC"}, {"year": "2019", "grade": "60%", "institution": "KM Blooming Hr. Sec. School, Kangabok", "qualification": "HSSLC"}, {"year": "2023", "grade": "67.4%", "institution": "Bethesda College of Nursing, CCpur", "qualification": "GNM"}]	[]	\N			2025-05-13		Hinduism	[]	MNC-16752/24				2026-07-19 09:04:52.076924	2026-07-19 09:04:52.076924	Indian	\N	\N	[]	[]
82	34	1	1992-09-19	Male	Married	\N	\N	\N	Bamon Kampu Makha Leikai, Imphal East-795008	Bamon Kampu Makha Leikai, Imphal East-795008	[{"year": "2007", "grade": "49%", "institution": "Laishram Mani Memorial School", "qualification": "HSLC"}, {"year": "2009", "grade": "51%", "institution": "Advance Innovative Modern School, Khongman Mangjil", "qualification": "HSSLC"}, {"year": "2014", "grade": "55.1%", "institution": "Regional Istitute of Pharmacuetical Science & Technology", "qualification": "D. Pharm"}]	[{"to": "", "from": "", "employer": "", "designation": "", "responsibilities": ""}]	\N			2014-08-12		Hinduism	[]					2026-07-19 10:04:47.955864	2026-07-19 10:04:47.955864	Indian	\N	\N	[]	[]
83	35	1	1993-02-09	Female	Married	\N	\N	\N	Khongman	Khongman	[]	[]	\N			2023-10-01		Hinduism	[]					2026-07-19 10:19:50.511471	2026-07-19 10:19:50.511471	Indian	\N	\N	[]	[]
84	36	1	1998-03-01	Female	Married	\N	\N	\N	Mayang Imphal Thana Awang Leikai, Imphal West-795132	Mayang Imphal Thana Awang Leikai, Imphal West-795132	[{"year": "2013", "grade": "67%", "institution": "Standard Robart Hr. Sec. School", "qualification": "HSLC"}, {"year": "2015", "grade": "70.8%", "institution": "T.G Hr Sec School", "qualification": "HSSLC"}, {"year": "2022", "grade": "64.4%", "institution": "Dr, B.D. Jatti Homeopathic Medical College, Karnataka", "qualification": "BHMS"}]	[{"to": "30/10/25", "from": "14/11/2022", "employer": "Care and Cure Hospital", "designation": "RMO", "responsibilities": ""}]	\N			2026-05-08		Hinduism	[{"name":"Asem Tompok Singh","percentage":100,"relationship":"Spouse"}]					2026-07-19 10:51:25.899452	2026-07-19 10:51:25.899452	Indian	\N	\N	[]	[]
85	37	1	2000-03-29	Female	Single	\N	\N	\N	Kyamgei Maning Leikai	Kyamgei Maning Leikai	[{"year": "2015", "grade": "60.4%", "institution": "Standard Robarth Hr. Sec. School", "qualification": "HSLC"}, {"year": "2017", "grade": "60.6%", "institution": "Standard Robarth Hr. Sec. School", "qualification": "HSE"}, {"year": "2024", "grade": "61.6%", "institution": "Solan Homeopathic Medical College & Hospital", "qualification": "BHMS"}, {"year": "", "grade": "", "institution": "", "qualification": ""}]	[{"to": "", "from": "6months", "employer": "District Hospital, Thoubal", "designation": "RMO", "responsibilities": ""}]	\N			2025-01-05		Hinduism	[]					2026-07-19 11:01:25.660332	2026-07-19 11:01:25.660332	Indian	\N	\N	[]	[]
87	39	1	1998-01-23	Female	Single	\N	\N	\N	Kongba Nandeibam Leikai, Imphal East-795008	Kongba Nandeibam Leikai, Imphal East-795008	[{"year": "2013", "grade": "65.6%", "institution": "Brighter Academy", "qualification": "HSLC"}, {"year": "2015", "grade": "67.2%", "institution": "T.G Hr Sec School", "qualification": "HSSLC"}, {"year": "2021", "grade": "65.7%", "institution": "Dr. Bhim Rao Bakson Homeopathic Medical College, Greater Noida", "qualification": "BHMS"}]	[]	\N			2025-06-01		Hinduism	[]					2026-07-19 11:32:00.159915	2026-07-19 11:32:00.159915	Indian	\N	\N	[]	[]
88	40	1	1989-03-03	Male	Single	\N	\N	\N	Singjamei Wangma Bheigyabati Leikai Kongba Road-Imphal East	Singjamei Wangma Bheigyabati Leikai Kongba Road-Imphal East	[{"year": "2005", "grade": "71.6%", "institution": "NIOS", "qualification": "HSLC"}, {"year": "2010", "grade": "76%", "institution": "Cochin Institute of Technology", "qualification": "Diploma in X-Ray Technician"}, {"year": "2010", "grade": "78%", "institution": "Cochin Institute of Technology", "qualification": "Diploma in Electrocardiogram"}]	[{"to": "25/11/2024", "from": "01/02/2011", "employer": "Mona Laboratory", "designation": "Radiographer", "responsibilities": ""}, {"to": "31/03/2011", "from": "01/10/2010", "employer": "JN. Hospital, Porompat", "designation": "Radiographer", "responsibilities": ""}]	\N			2025-11-04		Hinduism	[]					2026-07-19 11:51:01.299451	2026-07-19 11:51:01.299451	Indian	\N	\N	[]	[]
89	41	1	1994-02-20	Female	Married	\N	\N	\N	Wangkhei Ningthem Pukhri Makha Leirak	Wangkhei Ningthem Pukhri Makha Leirak	[]	[]	\N			2021-03-15		Hinduism	[]					2026-07-19 11:58:06.203951	2026-07-19 11:58:06.203951	Indian	\N	\N	[]	[]
90	41	2	1994-02-20	Female	Married	\N	\N	\N	Wangkhei Ningthem Pukhri Makha Leirak	Wangkhei Ningthem Pukhri Makha Leirak	[]	[]	\N			\N	\N	Hinduism	[]					2026-07-19 12:02:01.884437	2026-07-19 12:02:01.884437	Indian	\N	\N	[]	[]
91	42	1	1994-03-10	Female	Married	\N	\N	\N	Khongman Bashikhong, Imphal East-795008	Khongman Bashikhong, Imphal East-795008	[{"year": "2011", "grade": "First Division", "institution": "Advance Innovative Modern School, Khongman Mangjil", "qualification": "HSSLC"}, {"year": "2019", "grade": "First Division", "institution": "Alvas Homeopathic Medical College", "qualification": "BHMS"}]	[]	\N			2020-07-21		Hinduism	[{"name":"Kangujam Rajiv Singh","percentage":100,"relationship":"Spouse"}]					2026-07-21 02:35:28.790132	2026-07-21 02:35:28.790132	Indian	\N	\N	[]	[]
92	42	2	1994-03-10	Female	Married	\N	\N	\N	Khongman Bashikhong, Imphal East-795008	Khongman Bashikhong, Imphal East-795008	[{"year": "2011", "grade": "First Division", "institution": "Advance Innovative Modern School, Khongman Mangjil", "qualification": "HSSLC"}, {"year": "2019", "grade": "First Division", "institution": "Alvas Homeopathic Medical College", "qualification": "BHMS"}, {"year": "2009", "grade": "Second division", "institution": "St. George High School", "qualification": "HSLC"}]	[]	\N			\N	\N	Hinduism	[{"name":"Kangujam Rajiv Singh","percentage":100,"relationship":"Spouse"}]					2026-07-21 02:37:06.12425	2026-07-21 02:37:06.12425	Indian	\N	\N	[]	[]
93	43	1	1998-12-12	Female	Single	\N	\N	\N	New Checkon Mandop Leirak- Imphal East	New Checkon Mandop Leirak- Imphal East	[{"year": "2013", "grade": "59%", "institution": "Amutombi Devine Life English School, Wabagai", "qualification": "HSLC"}, {"year": "2015", "grade": "72%", "institution": "Somendrosana Royal Hr. Sec. ", "qualification": "HSSLC"}, {"year": "2019", "grade": "Passed", "institution": "Kangleipak Medical & Nursing Institution", "qualification": "BSc. Nursing"}]	[]	\N			2021-01-11		Hinduism	[]	MNC-11362/19				2026-07-21 02:51:44.796221	2026-07-21 02:51:44.796221	Indian	\N	\N	[]	[]
94	44	1	2002-02-02	Male	Single	\N	\N	\N	Lilong Chajing Konjeng Leikai, Imphal West-795130	Lilong Chajing Konjeng Leikai, Imphal West-795130	[{"year": "2017", "grade": "64%", "institution": "Standard Robart Hr. Sec. School", "qualification": "HSLC"}, {"year": "2019", "grade": "57%", "institution": "Standard Robarth Hr. Sec. School", "qualification": "HSSLC"}, {"year": "2023", "grade": "82%", "institution": "Saraswati Institute of Management and Paramedical Science", "qualification": "Bsc. OT Technology"}]	[{"to": "", "from": "6months", "employer": "JNIMS", "designation": "Trainee OT Technician", "responsibilities": ""}]	\N			2024-06-17		Sanamahism	[]					2026-07-21 03:15:53.000235	2026-07-21 03:15:53.000235	Indian	\N	\N	[]	[]
95	45	1	2002-03-15	Female	Single	\N	\N	\N	Hiyanglam Makha Leikai, Kakching District-795103	Hiyanglam Makha Leikai, Kakching District-795103	[{"year": "2017", "grade": "50.6%", "institution": "K.M Blooming Hr. Sec. School, Khangabok", "qualification": "HSLC"}, {"year": "2019", "grade": "54.2%", "institution": "KM Blooming Hr. Sec. School, Kangabok", "qualification": "HSSLC"}, {"year": "2023", "grade": "First Division", "institution": "Bethesda College of Nursing, CCpur", "qualification": "BSc. Nursing"}]	[{"to": "27/08/24", "from": "27/02/2024", "employer": "Advance Speciality Hospital & Research Institute", "designation": "Trainee Nurse", "responsibilities": ""}]	\N			2024-11-24		Hinduism	[]	MNC-16753/24				2026-07-21 03:29:19.67558	2026-07-21 03:29:19.67558	Indian	\N	\N	[]	[]
96	46	1	2004-03-08	Female	Single	\N	\N	\N	Sagolband Bijoy Govinda, Imphal West-795001	Sagolband Bijoy Govinda, Imphal West-795001	[{"year": "2019", "grade": "Second Division", "institution": "St. Dominic Savio School", "qualification": "HSLC"}, {"year": "2021", "grade": "First Division", "institution": "Brilliance School", "qualification": "HSSLC"}, {"year": "2024", "grade": "First Division", "institution": "Imphal College", "qualification": "BA. Geography"}]	[]	\N			2026-06-06		Hinduism	[]					2026-07-21 03:40:06.412876	2026-07-21 03:40:06.412876	Indian	\N	\N	[]	[]
97	47	1	1996-10-03	Female	Married	\N	\N	\N	Langthabal	Langthabal	[{"year": "2010", "grade": "61.4%", "institution": "Good Samaritan Public School, Saikhul", "qualification": "HSLC"}, {"year": "2013", "grade": "63.8%", "institution": "HRD Academy Ghari", "qualification": "HSSLC"}, {"year": "2017", "grade": "Passed", "institution": "SIMS Group of Institution, Guntur, Andra Pradesh", "qualification": "BSc. Nursing"}]	[]	\N			2019-06-10		Hinduism	[]	MNC-11698/19				2026-07-21 03:53:54.639969	2026-07-21 03:53:54.639969	Indian	\N	\N	[]	[]
98	48	1	1997-04-01	Female	Single	\N	\N	\N	Moirang Patlou Leikai, Bishnupur District	Moirang Patlou Leikai, Bishnupur District	[{"year": "2012", "grade": "56.6%", "institution": "Advance Public School, Moirang", "qualification": "HSLC"}, {"year": "2014", "grade": "61%", "institution": "Advance Intermidiate College, Moirang", "qualification": "HSSLC"}, {"year": "2018", "grade": "Second division", "institution": "Moirang College", "qualification": "Bsc. Botany Honours"}, {"year": "2021", "grade": "Passed", "institution": "DMCC,DM College of Science, Imphal", "qualification": "B.VOC. OTT"}]	[{"to": "", "from": "6months", "employer": "JNIMS", "designation": "Intern", "responsibilities": ""}, {"to": "", "from": "6Months", "employer": "JNIMS", "designation": "Trainee OT Technician", "responsibilities": ""}]	\N			2023-04-24		Hinduism	[]					2026-07-21 05:03:31.360593	2026-07-21 05:03:31.360593	Indian	\N	\N	[]	[]
99	49	1	1999-04-01	Female	Single	\N	\N	\N	Phubala Awang Mamang Leikai, Bishnupur-795126	Phubala Awang Mamang Leikai, Bishnupur-795126	[{"year": "2014", "grade": "46.6%", "institution": "Public School Ningthouhong", "qualification": "HSLC"}, {"year": "2016", "grade": "63%", "institution": "Extra Edge School Sagolband", "qualification": "HSSLC"}, {"year": "2020", "grade": "2021", "institution": "International Hospital College of Nursing", "qualification": "BSc. Nursing"}]	[]	\N			2021-08-09		Hinduism	[]	MNC-16505/24				2026-07-21 05:40:54.812093	2026-07-21 05:40:54.812093	Indian	\N	\N	[]	[]
100	50	1	1997-12-01	Female	Single	\N	\N	\N	Nongmeibung Academy Road	Charoi Khullen Part 1, Churachandpur-795124	[{"year": "2012", "grade": "52%", "institution": "Loyala School, Bishnupur", "qualification": "HSLC"}, {"year": "2014", "grade": "54%", "institution": "Pioneer Academy", "qualification": "HSSLC"}, {"year": "2016", "grade": "Passed", "institution": "Shija Pramedical Research Academy, Langol", "qualification": "DOTT"}]	[{"to": "17/12/2018", "from": "17/09/2018", "employer": "Shija Hospitals & Research Institute, Langol", "designation": "Intern", "responsibilities": ""}]	\N			2020-12-01		Christianity	[]					2026-07-21 05:53:40.958664	2026-07-21 05:53:40.958664	Indian	\N	\N	[]	[]
101	51	1	1993-04-28	Female	Single	\N	\N	\N	Kongba Makha Nadeibam Leikai, Imphal East-795008	Kongba Makha Nadeibam Leikai, Imphal East-795008	[{"year": "2009", "grade": "56%", "institution": "Martin Grammar School", "qualification": "HSLC"}, {"year": "2011", "grade": "62%", "institution": "Fancier Abriham Hr. Sec. School", "qualification": "HSSLC"}, {"year": "2015", "grade": "Passed", "institution": "SIMS Group of Institution, Guntur, Andra Pradesh", "qualification": "BSc. Nursing"}]	[{"to": "27/02/2019", "from": "13/01/2016", "employer": "Medica Superspecialty Hospital, Kolkata", "designation": "Staff Nurse, Ward", "responsibilities": ""}]	\N			2019-06-10		Hinduism	[]	MNC-7984/17				2026-07-21 06:13:52.233608	2026-07-21 06:13:52.233608	Indian	\N	\N	[]	[]
102	52	1	1987-03-01	Female	Married	\N	\N	\N	Soibam Leikai Near Citizen Club-Imphal East	Soibam Leikai Near Citizen Club-Imphal East	[{"year": "2002", "grade": "46.6%", "institution": "Manipur Rural Institute High School", "qualification": "HSLC"}, {"year": "2005", "grade": "38.8%", "institution": "Mem Higher Sec. School", "qualification": "HSSLC"}, {"year": "2009", "grade": "60.6%", "institution": "Down Town School of Nursing", "qualification": "GNM"}]	[{"to": "", "from": "5years", "employer": "Down Town Hospital, Dispur", "designation": "Staff Nurse", "responsibilities": ""}, {"to": "30/09/2013", "from": "15/04/2011", "employer": "Pratiksha Hospital, VIP Road, Guwahati", "designation": "Staff Nurse", "responsibilities": ""}]	\N			2014-05-12		Hinduism	[]					2026-07-21 06:36:26.344559	2026-07-21 06:36:26.344559	Indian	\N	\N	[]	[]
103	53	1	2002-10-28	Male	Single	\N	\N	\N	Bamon Kampu Makha Leikai, Imphal East-795008	Bamon Kampu Makha Leikai, Imphal East-795008	[{"year": "2018", "grade": "65.2%", "institution": "Sainik View Getwell School", "qualification": "HSLC"}, {"year": "2020", "grade": "68.6%", "institution": "The Eden Public School", "qualification": "HSE"}, {"year": "2024", "grade": "70.2%", "institution": "Mewar University", "qualification": "Bsc. OT Technology"}]	[{"to": "", "from": "6months", "employer": "Acme Fertility and Healthcare Centre", "designation": "Intern", "responsibilities": ""}]	\N			2026-03-01		Hinduism	[]					2026-07-21 10:05:42.093895	2026-07-21 10:05:42.093895	Indian	\N	\N	[]	[]
104	54	1	1999-04-01	Female	Married	\N	\N	\N	Konthoujam Mamang Leikai	Konthoujam Mamang Leikai	[{"year": "2014", "grade": "45.2%", "institution": "Regular English High School", "qualification": "HSLC"}, {"year": "2016", "grade": "69.6%", "institution": "Alpha BCI Memorial Academy", "qualification": "HSE"}, {"year": "2019", "grade": "63.3%", "institution": "Imphal College", "qualification": "BA. Education Honours"}, {"year": "2019", "grade": "Grade A", "institution": "Padma Computer & Electronics", "qualification": "CCCA"}]	[]	\N			2021-12-29		Hinduism	[]					2026-07-21 10:17:04.998216	2026-07-21 10:17:04.998216	Indian	\N	\N	[]	[]
105	55	1	1993-01-01	Female	Married	\N	\N	\N	Sagolband Kangabam Leikai	Sagolband Kangabam Leikai	[{"year": "2008", "grade": "Passed", "institution": "Hijam Irabot Memorial Public School", "qualification": "HSLC"}, {"year": "2010", "grade": "Passed", "institution": "Lilong Hr. Sec. School", "qualification": "HSE"}, {"year": "2013", "grade": "Second division", "institution": "GP Women's College", "qualification": "BSc."}, {"year": "2010", "grade": "Passed", "institution": "Allied Infotech", "qualification": "BCA"}]	[{"to": "25/08/2017", "from": "20/11/2013", "employer": "Acme Fertility and Healthcare Centre", "designation": "Front Office Executive", "responsibilities": ""}, {"to": "31/05/2022", "from": "10/11/2017", "employer": "Cloud Nine Hospital", "designation": "Co ordinator cum  PA", "responsibilities": ""}]	\N			2022-09-01		Hinduism	[]					2026-07-21 10:42:30.007463	2026-07-21 10:42:30.007463	Indian	\N	\N	[]	[]
106	56	1	2002-01-05	Female	Single	\N	\N	\N	Moidangpok Aheibam Leikai	Moidangpok Aheibam Leikai	[{"year": "2018", "grade": "Second Division", "institution": "Brighter Academy, Khumbong", "qualification": "HSLC"}, {"year": "2020", "grade": "Second Division", "institution": "Ibotonsana Girls Hr. Sec. School", "qualification": "HSE"}, {"year": "2023", "grade": "Grade A", "institution": "Oriental College", "qualification": "BA"}, {"year": "2024", "grade": "Passed", "institution": "Skill India", "qualification": "Front Office Trainee"}]	[{"to": "28/07/2024", "from": "29/06/2024", "employer": "Classic Group of Hotels", "designation": "Intern", "responsibilities": ""}]	\N			2024-10-09		Sanamahism	[]					2026-07-21 10:53:55.381704	2026-07-21 10:53:55.381704	Indian	\N	\N	[]	[]
107	57	1	1982-09-13	Male	Married	\N	\N	\N	Khagempalli Panthak	Khagempalli Panthak	[]	[]	\N						[]					2026-07-22 10:37:49.416656	2026-07-22 10:37:49.416656	Indian	\N	\N	[]	[]
108	58	1	1975-01-30	Male	Married	\N	\N	\N	Hiyang Hiren Leirak, Palace Compound, Imphal East-795005	Hiyang Hiren Leirak, Palace Compound, Imphal East-795005	[{"year": "1990", "grade": "First Division", "institution": "CBSE", "qualification": "X"}, {"year": "1992", "grade": "First Division", "institution": "AISSCEE", "qualification": "XII"}, {"year": "1998", "grade": "First Division", "institution": "RIMS, Imphal", "qualification": "MBBS"}, {"year": "2023", "grade": "A Grade", "institution": "NBE,New Delhi", "qualification": "DNB"}]	[{"to": "2013-01-12", "from": "2008-02-01", "employer": "Shija Hospitals & Research Institute, Langol", "designation": "Consultant Laparoscopic Gynaecologist", "responsibilities": "OPD and IPD consultation, to Perform Obgy Surgery"}]	\N			2013-01-14		Hinduism	[{"name":"Dr. Mrinalini Konjengbam","percentage":100,"relationship":"Spouse"}]			MNMC-01721	2028-01-16	2026-08-01 10:55:07.70355	2026-08-01 10:55:07.70355	Indian	Acme	Acme	[{"name": "Diploma in Aesthetic Gynaecology", "validityPeriod": "lifetime", "certificateNumber": "AG2023", "issuingOrganization": "Indian College of Cosmetic Gynaecology"}]	[{"name": "Late. Dr. Elangbam Yaima Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Keisham Bimola Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Dr. Mrinalini Konjengbam", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
109	59	1	1974-07-14	Female	Married	\N	\N	\N	Hiyang Hiren Leirak, Palace Compound, Imphal East-795005	Hiyang Hiren Leirak, Palace Compound, Imphal East-795005	[{"year": "1990", "grade": "First Division", "institution": "BOSEM", "qualification": "X"}, {"year": "1992", "grade": "First Division", "institution": "CBSE", "qualification": "XII"}, {"year": "1998", "grade": "First Division", "institution": "RIMS, Imphal", "qualification": "MBBS"}, {"year": "2003", "grade": "First Division", "institution": "University of Mumbai", "qualification": "MS(Anatomy & Physiology)"}]	[{"to": "2003-01-31", "from": "2000-02-01", "employer": "Seth G.S.M.C & K.EM. Hospital", "designation": "Junior Resident", "responsibilities": ""}, {"to": "2014-09-30", "from": "2007-02-01", "employer": "RIMS, Imphal", "designation": "Senior Resident/Demonstrator", "responsibilities": ""}, {"to": "2025-08-31", "from": "2021-03-01", "employer": "SAHS,Imphal", "designation": "Assistant Professor", "responsibilities": ""}]	\N					Hinduism	[{"name":"Dr. James Elangbam","percentage":100,"relationship":"Spouse"}]					2026-08-01 11:34:08.516124	2026-08-01 11:34:08.516124	Indian			[{"name": "Life Member", "validityPeriod": "lifetime", "certificateNumber": "IMA", "issuingOrganization": "IMA"}]	[{"name": "Dr. Konjengbam Mani Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Potsangbam Nalini Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Dr. James Elangbam", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
110	60	1	1998-03-18	Female	Single	\N	\N	\N	Thongju Part 2	Thongju Part 2	[{"year": "2013", "grade": "First Division", "institution": "Catholic School, Canchipur", "qualification": "HSLC"}, {"year": "2015", "grade": "First Division", "institution": "Comet School, Changangei", "qualification": "HSSLC"}, {"year": "2019", "grade": "First Division", "institution": "R.B(PG) College, Narich, Agra", "qualification": "BSc. Agriculture"}]	[{"to": "2024-08-31", "from": "2023-01-01", "employer": "ILDS Hospital", "designation": "Receptionist", "responsibilities": ""}]	\N			2024-09-01		Hinduism	[{"name":"Athokpam Ibeyaima","percentage":100,"relationship":"Mother"}]					2026-08-02 10:24:23.240685	2026-08-02 10:24:23.240685	Indian	Near ISOR School Canchipur, Imphal East, Mnipur-795003	Near ISOR School Canchipur, Imphal East, Mnipur-795003	[{"name": "CCC", "validityPeriod": "lifetime", "certificateNumber": "IM044234C7D0A803", "issuingOrganization": "NEILIT"}, {"name": "DCA", "validityPeriod": "Lifetime", "certificateNumber": "PIIT4105", "issuingOrganization": "Poitrex, Imphal"}]	[{"name": "Athokpam Ghanashyam", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Athokpam Ibeyaima", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
111	61	1	2000-05-18	Female	Single	\N	\N	\N	Malom Bazar	Malom Bazar	[{"year": "2016", "grade": "54%", "institution": "Vale Academy", "qualification": "HSLC"}, {"year": "2018", "grade": "55%", "institution": "Millenium Institute of Sciences", "qualification": "HSSLC"}, {"year": "2020", "grade": "76.8%", "institution": "School of ANM", "qualification": "ANM"}, {"year": "2025", "grade": "80.6%", "institution": "Aruna College of Nursing, Tumkur", "qualification": "BSc. Nursing"}]	[]	\N			2026-06-05		Hinduism	[{"name":"Hijam Dhaneshwor Singh","percentage":100,"relationship":"Father"}]					2026-08-02 10:56:12.252816	2026-08-02 10:56:12.252816	Indian			[]	[{"name": "Hijam Dhaneshwor Singh", "ageDob": "58yrs", "contactNo": "", "relationship": "Father"}, {"name": "Hijam(O) Ratana Devi", "ageDob": "57yrs", "contactNo": "", "relationship": "Mother"}]
112	62	1	1997-05-31	Female	Single	\N	\N	\N	Wangkhei Hijam Leirak, Imphal East-795005	Wangkhei Hijam Leirak, Imphal East-795005	[{"year": "2012", "grade": "90%", "institution": "Eden Public School, Imphal East", "qualification": "HSLC"}, {"year": "2014", "grade": "70%", "institution": "R.K Sanatombi Devi Vidyala", "qualification": "HSC"}, {"year": "2020", "grade": "First Division", "institution": "Bapuji Ayurvedic Medical College and Hospitals", "qualification": "BHMS"}]	[{"to": "2021-02-25", "from": "2020-10-12", "employer": "Prakriya Hospitals", "designation": "Physician Assistant", "responsibilities": ""}, {"to": "2023-08-31", "from": "2021-01-04", "employer": "Aditya Birla Memorial Hospital, Pune", "designation": "RMO", "responsibilities": ""}, {"to": "2026-11-15", "from": "2024-04-01", "employer": "Nemcare Superspeciality Hospital", "designation": "Clinical Assistant", "responsibilities": ""}]	\N			2024-11-20		Hinduism	[{"name":"Nongthombam Pameshori Devi","percentage":100,"relationship":"Sister"}]					2026-08-02 11:24:53.821819	2026-08-02 11:24:53.821819	Indian	Near Hijam Leirak Development Committee	Near Hijam Leirak Development Committee	[]	[{"name": "Nongthombam Bijoy Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Thingujam Promila Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
113	63	1	2004-04-01	Female	Single	\N	\N	\N	Heingang Makha Leikai, Imphal East-795002	Heingang Makha Leikai, Imphal East-795002	[{"year": "2019", "grade": "60%", "institution": "St. Thomas High School", "qualification": "HSLC"}, {"year": "201", "grade": "61%", "institution": "E.K Higher Secondary School", "qualification": "HSSLC"}, {"year": "2023", "grade": "67.8%", "institution": "Shija Pramedical Research Academy, Langol", "qualification": "DOTT"}]	[]	\N			2024-06-17		Hinduism	[]					2026-08-03 08:11:08.901217	2026-08-03 08:11:08.901217	Indian	Heingang Police Station	Heingang Police Station	[]	[{"name": "Late Naorem Bashikhong Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Naorem Debashini Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
114	10	3	1997-04-01	Male	Single	\N	\N	\N	Thoubal Wangmataba Sorok Mathak, Thoubal-795138	Thoubal Wangmataba Sorok Mathak, Thoubal-795138	[{"year": "2012", "grade": "79.6%", "institution": "Ruda Academy Thoubal", "qualification": "HSLC"}, {"year": "2014", "grade": "87%", "institution": "Somorendra Sana Royal Higher Secondary School", "qualification": "HSSLC"}, {"year": "2020", "grade": "9.37CGPA", "institution": "Assam Down Town University", "qualification": "Bsc. OT Technology"}, {"year": "2022", "grade": "8.25CGPA", "institution": "Assam Down Town Ubiversity", "qualification": "MBA in Healthcare"}, {"year": "2017", "grade": "62.5%", "institution": "Thoubal College", "qualification": "BSC. Zoology Honours"}]	[]	\N					Hinduism	[]					2026-08-05 11:29:26.238518	2026-08-05 11:29:26.238518	Indian			[]	[{"name": "Akoijam Mangi Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Akoijam Bimola Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Okram Thoibi Devi", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
115	64	1	1996-03-07	Female	Married	\N	\N	\N	Naharup Awang Leikai, Imphal East	Naharup Awang Leikai, Imphal East	[{"year": "2011", "grade": "60.4%", "institution": "H. Keinahal Memorial English School", "qualification": "HSLC"}, {"year": "2013", "grade": "78.5%", "institution": "North Point Hr. Sec. School", "qualification": "HSSLC"}, {"year": "2019", "grade": "72%", "institution": "Dr. NTR University of Health Science", "qualification": "BSc. Nursing"}]	[{"to": "2026-08-03", "from": "2019-12-25", "employer": "Little Clinic", "designation": "Nursing Officer", "responsibilities": ""}]	\N	101925655388		2026-08-05		Hinduism	[{"name":"Ningombam Gunamani Singh","percentage":100,"relationship":"Spouse"}]					2026-08-07 05:12:49.068707	2026-08-07 05:12:49.068707	Indian	Thangbi Thangba Temple	Thangbi Thangba Temple	[{"name": "BLS/ACLS", "validityPeriod": "lifetime", "certificateNumber": "IAP001", "issuingOrganization": "IAP"}]	[{"name": "Late Mongbijam Joy Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Mongbijam Monteshwori Devi", "ageDob": "59", "contactNo": "8974291877", "relationship": "Mother"}, {"name": "Ningombam Gunamani Singh", "ageDob": "30", "contactNo": "9774687926", "relationship": "Spouse"}]
130	79	1	1985-05-07	Female	Married	\N	\N	\N	Kwakeithel Mayai Koibi Konthoujam Leikai	Kwakeithel Mayai Koibi Konthoujam Leikai	[{"year": "2001", "grade": "48.6%", "institution": "Brighter Academy", "qualification": "HSLC"}, {"year": "2003", "grade": "52.4%", "institution": "Elite Senior Sec. School", "qualification": "HSSLC"}, {"year": "2008", "grade": "First Division", "institution": "Sri Ram School of Nursing Kakinada", "qualification": "GNM"}]	[]	\N			2019-09-01		Hinduism	[]	MNC-1090				2026-08-08 10:10:25.266422	2026-08-08 10:10:25.266422	Indian			[]	[{"name": "Late.W. Birendra Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Late W. Mani Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Salam Bhubon Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
116	65	1	1988-01-28	Female	Married	\N	\N	\N	Singjamei Chinamakha Maibam Leirak, Kshetri Leikai, Imphal West-795001	Singjamei Chinamakha Maibam Leirak, Kshetri Leikai, Imphal West-795001	[{"year": "2003", "grade": "64.4%", "institution": "Rahmania High School", "qualification": "HSLC"}, {"year": "2007", "grade": "57.6%", "institution": "Hundred Flowers Hr. Sec School", "qualification": "HSSLC"}, {"year": "2010", "grade": "66.76%", "institution": "Tamil Nadu Nurses & Midwives Council", "qualification": "GNM"}, {"year": "2016", "grade": "72.14%", "institution": "Noor College of Nursing", "qualification": "PB BSc. Nursing"}]	[{"to": "2020-08-31", "from": "2011-03-02", "employer": "GNRC Ltd, Dispur, Guwahati", "designation": "Staff Nurse, ICU & Shift Incharge", "responsibilities": ""}, {"to": "2022-01-31", "from": "2020-09-15", "employer": "Ayursundra Super Superspeciality Hospital", "designation": "ICCU, Shift Incharge", "responsibilities": ""}, {"to": "2024-10-31", "from": "2023-08-25", "employer": "Asian Hospital & Research Institute", "designation": "ICU, Incharge", "responsibilities": ""}, {"to": "2023-05-02", "from": "2022-04-04", "employer": "Nazareth Institute & Diagnostic Centre", "designation": "Nursing, Incharge", "responsibilities": ""}, {"to": "2026-08-01", "from": "2025-12-01", "employer": "Raj Medicity Hospital", "designation": "Staff Nurse ICU", "responsibilities": ""}]	\N			2026-08-03		Hinduism	[{"name":"Kshetrimayum Jeweel","percentage":100,"relationship":"Spouse"}]	MNC-14567/22	2027-09-29			2026-08-07 06:45:18.044117	2026-08-07 06:45:18.044117	Indian	Lane No. 4 Near Yai Flower	Lane No. 4 Near Yai Flower	[{"name": "BLS/ALS", "validityPeriod": "6months", "certificateNumber": "GNRC01", "issuingOrganization": "GNRC Hospital, Guwahati"}]	[{"name": "Thangjam Thoiba Singh", "ageDob": "68yrs", "contactNo": "9362673533", "relationship": "Father"}, {"name": "Thangjam Shanti Devi", "ageDob": "60yrs", "contactNo": "9774358319", "relationship": "Mother"}, {"name": "Kshetrimayum Jeweel", "ageDob": "42yrs", "contactNo": "8837412063", "relationship": "Spouse"}, {"name": "Henthoi Kshetrimayum", "ageDob": "3Yrs 6months", "contactNo": "", "relationship": "Children"}]
117	66	1	1992-03-05	Female	Married	\N	\N	\N	Lilong Haoreibi Awang Leikai, Thoubal-795130	Lilong Haoreibi Awang Leikai, Thoubal-795130	[{"year": "2007", "grade": "43.6%", "institution": "Angahal Higher Sec. School", "qualification": "HSLC"}, {"year": "2009", "grade": "45.2%", "institution": "Little Master English Hr. Sec. School", "qualification": "HSSLC"}, {"year": "2020", "grade": "67.6%", "institution": "J.N School of Nursing", "qualification": "GNM"}]	[{"to": "", "from": "", "employer": "EMA Hospital", "designation": "Staff Nurse, Covid Centre", "responsibilities": ""}]	\N			2021-08-26		Hinduism	[{"name":"MD Mustakim","percentage":100,"relationship":"Spouse"}]			MNMC-12753/21	2026-09-20	2026-08-07 08:06:41.083308	2026-08-07 08:06:41.083308	Indian	Sambrukhong Bogi Mohalla	Sambrukhong Bogi Mohalla	[{"name": "Basic NRP Provider", "validityPeriod": "6months", "certificateNumber": "55871", "issuingOrganization": "IAP"}]	[{"name": "BS. Abdul Kalam", "ageDob": "55yrs", "contactNo": "", "relationship": "Father"}, {"name": "BS(O) Hena", "ageDob": "48yrs", "contactNo": "", "relationship": "Mother"}, {"name": "MD Mustakim", "ageDob": "32yrs", "contactNo": "7005239643", "relationship": "Spouse"}]
118	67	1	2005-02-08	Female	Single	\N	\N	\N	Tekcham Mamang Leikai, Khongjom, Thoubal	Tekcham Mamang Leikai, Khongjom, Thoubal	[{"year": "2020", "grade": "Passed", "institution": "Khongjom Standard English School", "qualification": "HSLC"}, {"year": "2022", "grade": "Passed", "institution": "Khongjom Standard English", "qualification": "HSSLC"}, {"year": "2025", "grade": "Passed", "institution": "Nightingle Nursing Institute, Porompat ", "qualification": "GNM"}]	[]	\N			2025-12-05		Hinduism	[{"name":"Sapam Surchandra Singh","percentage":50,"relationship":"Father"},{"name":"Sapam Indira Devi","percentage":50,"relationship":"Mother"}]					2026-08-07 09:29:34.29465	2026-08-07 09:29:34.29465	Indian	Khongjom Standard English School	Khongjom Standard English School	[]	[{"name": "Sapam Surchandra Singh", "ageDob": "44yrs", "contactNo": "8119072066", "relationship": "Father"}, {"name": "Sapam Indira Devi", "ageDob": "44yrs", "contactNo": "9612504904", "relationship": "Mother"}, {"name": "Sapam Robinson Singh", "ageDob": "16", "contactNo": "", "relationship": "Brother"}]
119	68	1	1997-03-03	Female	Single	\N	\N	\N	Khomidok Ipum Mapal, Imphal East-795010	Khomidok Ipum Mapal, Imphal East-795010	[{"year": "2013", "grade": "First Division", "institution": "Hundred Flower Hr. Sec. School", "qualification": "HSLC"}, {"year": "2015", "grade": "First Division", "institution": "Hundred Flowers Hr. Sec School", "qualification": "HSE"}, {"year": "2019", "grade": "First Division", "institution": "Kangleipak Medical & Nursing Institution", "qualification": "BSc. Nursing"}]	[]	\N			2020-02-24		Islam	[{"name":"MD Ranjan Khan","percentage":50,"relationship":"Father"},{"name":"Ibem Bibi","percentage":50,"relationship":"Mother"}]	MNC-12398/21	2026-04-05			2026-08-07 09:52:21.426642	2026-08-07 09:52:21.426642	Indian			[]	[{"name": "MD Ranjan Khan", "ageDob": "50yrs", "contactNo": "", "relationship": "Father"}, {"name": "Ibem Bibi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
120	69	1	2000-04-01	Female	Single	\N	\N	\N	Andro Machengpat Leikai, Imphal East-795149	Andro Machengpat Leikai, Imphal East-795149	[{"year": "2016", "grade": "48%", "institution": "Tam Mission High School, Andro", "qualification": "HSLC"}, {"year": "2018", "grade": "56.8%", "institution": "Pioneer Academy", "qualification": "HSSLC"}, {"year": "2023", "grade": "First Division", "institution": "CMC College of Nursing, Koirengei", "qualification": "BSc. Nursing"}]	[]	\N			2024-11-15		Hinduism	[]	MNC-16830/24	2029-10-08			2026-08-07 10:21:51.056942	2026-08-07 10:21:51.056942	Indian			[]	[{"name": "Yumkhaibam Devedra Singh", "ageDob": "54yrs", "contactNo": "", "relationship": "Father"}, {"name": "Yumkhaibam(o) Nganthoibi Devi", "ageDob": "52yrs", "contactNo": "", "relationship": "Mother"}]
121	70	1	2004-02-06	Female	Single	\N	\N	\N	New Checkon	Keihao Thangkhul Village, Senapati-795149	[{"year": "2019", "grade": "77.1%", "institution": "EM Standard High School", "qualification": "HSLC"}, {"year": "2021", "grade": "56.6%", "institution": "Don Bosco Hr. Sec. School", "qualification": "HSSLC"}, {"year": "2025", "grade": "66.5%", "institution": "J.N School of Nursing", "qualification": "GNM"}]	[]	\N			2025-11-15		Christianity	[]					2026-08-07 10:35:03.549138	2026-08-07 10:35:03.549138	Indian			[]	[{"name": "Rejoice Mungkung", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Ningreila Mungkhung", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
131	80	1	1989-03-10	Female	Married	\N	\N	\N	Bamon Kampu Makha Leikai, Imphal East-795008	Bamon Kampu Makha Leikai, Imphal East-795008	[{"year": "2006", "grade": "Passed", "institution": "NIOS", "qualification": "X"}, {"year": "2008", "grade": "Passed", "institution": "NIOS", "qualification": "XII"}, {"year": "2012", "grade": "Passed", "institution": "Siva Sai School of Nursing", "qualification": "GNM"}]	[]	\N			2014-09-01		Hinduism	[]	MNC-5100/14				2026-08-08 10:31:35.334108	2026-08-08 10:31:35.334108	Indian			[]	[{"name": "Yumnam Manglem", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Yumnam Jamuna", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Jackie Laiphrakpam", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
122	71	1	1992-03-04	Female	Married	\N	\N	\N	Lamsang Bazar	Lamsang Bazar	[{"year": "2007", "grade": "48.25", "institution": "Standard Robart Hr. Sec. School", "qualification": "HSLC"}, {"year": "2009", "grade": "58.6%", "institution": "Brajalal Institute of Science", "qualification": "HSSLC"}, {"year": "2013", "grade": "71.6%", "institution": "School of Community Nursing, RDO Lamsang", "qualification": "GNM"}]	[{"to": "2015-03-04", "from": "2013-12-05", "employer": "Marwari Hospital and Research Centre", "designation": "Staff Nurse, ICU", "responsibilities": ""}, {"to": "2013-06-26", "from": "2013-01-15", "employer": "Medica Supespecialty Hospital. Kolkata", "designation": "Intern", "responsibilities": ""}]	\N			2019-10-01		Hinduism	[]	MNC: 4481	2028-10-08			2026-08-07 11:23:15.328573	2026-08-07 11:23:15.328573	Indian			[{"name": "NBR", "validityPeriod": "6months", "certificateNumber": "BNCRP full", "issuingOrganization": "IAP"}]	[{"name": "Ningthoujam Jayenta Meitei", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Ningthoujam(O) Premabati", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Kshetrimayum Nicholas", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
123	72	1	2000-01-10	Female	Single	\N	\N	\N	Khagempalli Huidrom Leikai, Imphal West-795001	Khagempalli Huidrom Leikai, Imphal West-795001	[{"year": "2016", "grade": "48%", "institution": "Little Flower School", "qualification": "HSLC"}, {"year": "2018", "grade": "51%", "institution": "HRD Academy Ghari", "qualification": "HSSLC"}, {"year": "2021", "grade": "63%", "institution": "School of Community Nursing, RDO Lamsang", "qualification": "GNM"}]	[{"to": "", "from": "", "employer": "Medanta, The Medicity", "designation": "Staff Nurse, Ward", "responsibilities": ""}, {"to": "", "from": "", "employer": "Imphal Heart Institute, Imphal West", "designation": "Staff Nurse, ICU", "responsibilities": ""}]	\N			2026-05-22		Hinduism	[]					2026-08-07 11:46:20.367219	2026-08-07 11:46:20.367219	Indian	Near Tren House	Near Tren House	[]	[{"name": "Huidrom Pradip Meitei", "ageDob": "60yrs", "contactNo": "9366942408", "relationship": "Father"}, {"name": "Huidrom(O) Urmila Devi", "ageDob": "58yrs", "contactNo": "9863486874", "relationship": "Mother"}]
124	73	1	1982-02-01	Female	Married	\N	\N	\N	Bashikhong Kongba Irong	Bashikhong Kongba Irong	[{"year": "1997", "grade": "Passed", "institution": "Panthoibi High School", "qualification": "HSLC"}, {"year": "1999", "grade": "45.6%", "institution": "Regional College", "qualification": "HSSLC"}, {"year": "2004", "grade": "50%", "institution": "Bethesda College of Nursing, CCpur", "qualification": "GNM"}]	[]	\N			2026-03-02		Hinduism	[{"name":"Yambem Ganga Devi","percentage":100,"relationship":"Mother"}]					2026-08-07 11:56:52.909747	2026-08-07 11:56:52.909747	Indian			[]	[{"name": "Late Yambem Bijoy Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Yambem Ganga Devi", "ageDob": "1955", "contactNo": "", "relationship": "Mother"}, {"name": "hhhh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
125	74	1	2005-01-27	Female	Single	\N	\N	\N	Top Mayai Leikai, Imphal East	Top Mayai Leikai, Imphal East	[{"year": "2020", "grade": "59%", "institution": "North Eastern English School", "qualification": "HSLC"}, {"year": "2022", "grade": "64%", "institution": "Royal Academy Of Science, Wangkhei", "qualification": "HSSLC"}, {"year": "2025", "grade": "First Division", "institution": "J.N School of Nursing", "qualification": "GNM"}]	[]	\N			2025-08-22		Hinduism	[]					2026-08-08 06:56:13.250208	2026-08-08 06:56:13.250208	Indian			[]	[{"name": "Keisham Mohen Singh", "ageDob": "01/02/1973", "contactNo": "", "relationship": "Father"}, {"name": "Keisham Bimola Devi", "ageDob": "01/03/1973", "contactNo": "", "relationship": "Mother"}]
126	75	1	1982-03-02	Male	Married	\N	\N	\N	Naoremthong Khullem Leirak, Imphal West-795004	Naoremthong Khullem Leirak, Imphal West-795004	[{"year": "1997", "grade": "First Division", "institution": "St. Mary's High School", "qualification": "HSLC"}, {"year": "1999", "grade": "First Division", "institution": "Johnstone Higher Secondary School", "qualification": "HSSLC"}, {"year": "2005", "grade": "First Division", "institution": "RIMS, Imphal", "qualification": "MBBS"}, {"year": "2019", "grade": "First Division", "institution": "RIMS, Imphal", "qualification": "MD Anaesthesiology"}]	[]	\N			2026-07-01		Hinduism	[]			MNMC-00292	2030-04-23	2026-08-08 08:17:24.382916	2026-08-08 08:17:24.382916	Indian			[]	[{"name": "Ingudam Mohendro Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Ingudam(O)", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Wife", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
127	76	1	2003-05-05	Male	Single	\N	\N	\N	Khurai Awang Kongpal Laishram Leikai, Imphal East-795010	Khurai Awang Kongpal Laishram Leikai, Imphal East-795010	[{"year": "2019", "grade": "58.17%", "institution": "Pari Imom Khwai Sindamshang", "qualification": "HSLC"}, {"year": "2021", "grade": "53%", "institution": "E.K Higher Secondary School", "qualification": "HSSLC"}, {"year": "2023", "grade": "58.71%", "institution": "Kangleipak Medical & Nursing Institution", "qualification": "D. Pharm"}]	[]	\N			2026-05-08		Hinduism	[]					2026-08-08 08:40:56.3011	2026-08-08 08:40:56.3011	Indian			[]	[{"name": "Ningthoujam Nanda Singh", "ageDob": "73yrs", "contactNo": "8794183805", "relationship": "Father"}, {"name": "Laishram Thoibi Devi", "ageDob": "72yrs", "contactNo": "9856735877", "relationship": "Mother"}]
128	77	1	1987-10-31	Female	Married	\N	\N	\N	Keishampat Leimajam Leikai, Imphal West-795001	Keishampat Leimajam Leikai, Imphal West-795001	[{"year": "2003", "grade": "First Division", "institution": "Little Flower School", "qualification": "HSLC"}, {"year": "2005", "grade": "First Division", "institution": "Harvard School, Changangei", "qualification": "HSSLC"}, {"year": "2012", "grade": "66%", "institution": "Sree Balaji Dental College & Hospital, Chennai", "qualification": "BDS"}, {"year": "2019", "grade": "First Division", "institution": "Saveetha Dental College, Chennai", "qualification": "Master of Dental Surgery"}]	[]	\N			2024-03-03		Hinduism	[]			MSDRT-163	2017-12-31	2026-08-08 09:00:56.089349	2026-08-08 09:00:56.089349	Indian			[]	[{"name": "Pukhrambam Ibochouba", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Pukhrambam(o)", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Husband", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
129	78	1	1997-07-03	Female	Single	\N	\N	\N	Moirangkhom Bokulmakhong, Imphal West -795001	Moirangkhom Bokulmakhong, Imphal West -795001	[{"year": "2012", "grade": "First Division", "institution": "Maria Montessori Senior Sec. School", "qualification": "HSLC"}, {"year": "2014", "grade": "First Division", "institution": "Maria Montessori Senior Secondary School", "qualification": "HSSLC"}, {"year": "2018", "grade": "Second division", "institution": "Dr.C.Sobhanadri Siddhartha College of Nursing", "qualification": "BSc. Nursing"}]	[]	\N			2024-06-17		Hinduism	[]	MNC-10941/19				2026-08-08 09:39:41.362573	2026-08-08 09:39:41.362573	Indian			[]	[{"name": "Aribam Rekha Sharma", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Aribam(O) Surodhoni Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
132	81	1	1989-01-04	Female	Married	\N	\N	\N	Singjamei Okram Leikai	Singjamei Okram Leikai	[{"year": "2001", "grade": "Third Division", "institution": "Ajad English School, Meitram Makha Leikai", "qualification": "HSLC"}, {"year": "2007", "grade": "Passed", "institution": "NIOS", "qualification": "HSSLC"}, {"year": "2011", "grade": "Passed", "institution": "Swamy School of Nursing, Guntur", "qualification": "GNM"}]	[{"to": "2012-01-01", "from": "2011-08-01", "employer": "Raj Polyclinic", "designation": "Staff Nurse, Ward, ICU, LR", "responsibilities": ""}]	\N			2013-05-01		Hinduism	[]	MNC-2383				2026-08-09 04:48:44.979818	2026-08-09 04:48:44.979818	Indian			[]	[{"name": "Ningombam Khamba Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Ningombam(O) Ibemu Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Thoudam Jenish Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
133	82	1	1991-04-01	Female	Married	\N	\N	\N	Haobam Marak Irom Leikai, Imphal West	Haobam Marak Irom Leikai, Imphal West	[{"year": "2009", "grade": "56%", "institution": "Kendriya Vidyalaya", "qualification": "X"}, {"year": "2011", "grade": "65.7%", "institution": "Female Health Worker ", "qualification": "ANM"}]	[]	\N			2013-12-13		Hinduism	[]					2026-08-09 05:03:40.201721	2026-08-09 05:03:40.201721	Indian			[]	[{"name": "Ningombam Herachandra", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Ningombam(o) Bimola Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Khomdram Vivek Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
134	83	1	1999-04-01	Female	Married	\N	\N	\N	Lamdeng Khunou, Imphal West	Lamdeng Khunou, Imphal West	[{"year": "2017", "grade": "Passed", "institution": "CBSE", "qualification": "XII"}, {"year": "2014", "grade": "Passed", "institution": "Little Rose Hr. Sec. School", "qualification": "X"}, {"year": "2020", "grade": "Second division", "institution": "CCMTRI", "qualification": "DMLT"}]	[]	\N			2021-07-17		Hinduism	[]					2026-08-09 05:28:16.799701	2026-08-09 05:28:16.799701	Indian			[]	[{"name": "Moirangthem Jagat Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Moirangthem(O) Jagat Singh", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Husband", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
135	84	1	1984-01-13	Female	Married	\N	\N	\N	Bashikhong Bazar,Imphal East-795008	Bashikhong Bazar,Imphal East-795008	[{"year": "1999", "grade": "Third Division", "institution": "Catholic School, Canchipur", "qualification": "HSLC"}, {"year": "2001", "grade": "Second Division", "institution": "Sika Higher Secondary School", "qualification": "HSSLC"}, {"year": "2004", "grade": "Second division", "institution": "State Institute of Medical Lab. Technology, Poonamallee, Chennai", "qualification": "DMLT"}, {"year": "2003", "grade": "First Division", "institution": "Academic Board AIAMLT", "qualification": "ECG 3 months Training"}]	[]	\N			2020-05-08		Hinduism	[]					2026-08-09 05:55:07.302144	2026-08-09 05:55:07.302144	Indian			[]	[{"name": "Ningombam Chingoi Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Ningombam(o)", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Husband", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
136	85	1	1986-02-17	Female	Married	\N	\N	\N	Khurai Ahongei Leikai, Imphal East-795010	Khurai Ahongei Leikai, Imphal East-795010	[{"year": "2008", "grade": "Passed", "institution": "R.K. Sanatombi Devi Vidyala", "qualification": "X"}, {"year": "2005", "grade": "Passed", "institution": "Ng. Mani College", "qualification": "XII"}, {"year": "2008", "grade": "Passed", "institution": "Punjab Technical University, Jalandhar", "qualification": "BSc. MLT"}]	[]	\N			2014-07-04		Hinduism	[]					2026-08-09 06:13:44.143948	2026-08-09 06:13:44.143948	Indian			[]	[{"name": "Waribam Ibochou Singh", "ageDob": "1/03/1952", "contactNo": "", "relationship": "Father"}, {"name": "Waribam Kunjeshwori Devi", "ageDob": "01/03/1957", "contactNo": "", "relationship": "Mother"}, {"name": "Irom Japan Meetei", "ageDob": "17/10/1984", "contactNo": "", "relationship": "Spouse"}, {"name": "Irom Kyamba Meetei", "ageDob": "29/11/2010", "contactNo": "", "relationship": "Children"}]
137	86	1	2000-02-06	Female	Single	\N	\N	\N	Changangei Maning Leikai, Imphal West-795140	Changangei Maning Leikai, Imphal West-795140	[{"year": "2017", "grade": "Passed", "institution": "Langthabal Nambul Mapal High School, Langthabal", "qualification": "HSLC"}, {"year": "2019", "grade": "Second Division", "institution": "Nambol Higher Sec. School", "qualification": "HSSLC"}, {"year": "2022", "grade": "Passed", "institution": "Saina Institute of Medical Science", "qualification": "DMLT"}]	[]	\N			2023-02-07		Hinduism	[]					2026-08-09 06:30:31.62791	2026-08-09 06:30:31.62791	Indian			[]	[{"name": "Irom Jugindro Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Irom Bina Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
138	87	1	1998-09-19	Female	Single	\N	\N	\N	Dewlahland	Happy Villa Tamenglong Ward No.IV	[{"year": "2014", "grade": "Second Division", "institution": "Tengkonjang Higher Seconadry School", "qualification": "HSLC"}, {"year": "2017", "grade": "First Division", "institution": "Model Higher Sec. School", "qualification": "HSSLC"}, {"year": "2018", "grade": "Passed", "institution": "Saina Institute of Medical Science", "qualification": "DMLT"}]	[]	\N			2022-05-05		Christianity	[]					2026-08-09 11:35:36.506725	2026-08-09 11:35:36.506725	Indian			[]	[{"name": "Agunlungbou Moita", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Nambuanliu Moita", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
139	88	1	2001-03-01	Female	Married	\N	\N	\N	Khongman Okram Chuthek	Haokha Maning Leikai, Thoubal	[{"year": "2017", "grade": "Passed", "institution": "Little Rose Hr. Sc. School", "qualification": "X"}, {"year": "2020", "grade": "Passed", "institution": "The New Light Public School", "qualification": "XII"}, {"year": "2020", "grade": "Passed", "institution": "CCMTRI", "qualification": "DMLT"}]	[]	\N			2021-07-17		Hinduism	[]					2026-08-09 11:55:21.646058	2026-08-09 11:55:21.646058	Indian			[]	[{"name": "Hawaibam Ibomcha Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Hawaibam(O) Isheihanbi Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Lisham Sunanta", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
140	89	1	1991-03-08	Female	Married	\N	\N	\N	Bamon Kampu, Imphal East-795008	Bamon Kampu, Imphal East-795008	[{"year": "2008", "grade": "Passed", "institution": "Lilasing Khongnangkhong High School", "qualification": "HSLC"}, {"year": "2013", "grade": "Passed", "institution": "L. Chaobi Nursing Institute", "qualification": "ANM"}]	[]	\N			2019-07-22		Hinduism	[]					2026-08-10 05:46:28.586381	2026-08-10 05:46:28.586381	Indian			[]	[{"name": "Kshetrimayum Tomcha Singh", "ageDob": "70yrs", "contactNo": "", "relationship": "Father"}, {"name": "Kshetrimayum Pramo Devi", "ageDob": "70yrs", "contactNo": "", "relationship": "Mother"}, {"name": "Elangbam Mahavir Singh", "ageDob": "34", "contactNo": "", "relationship": "Spouse"}]
141	90	1	1987-09-07	Female	Single	\N	\N	\N	Kshetri Awang Leikai, Imphal East-795005	Kshetri Awang Leikai, Imphal East-795005	[{"year": "2013", "grade": "Passed", "institution": "Little Rose Hr. Sc. School", "qualification": "X"}]	[]	\N			2020-11-23		Islam	[]					2026-08-10 05:56:29.5381	2026-08-10 05:56:29.5381	Indian			[]	[{"name": "MD Jalaluddin", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Nur Bibi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
142	91	1	2025-09-27	Female	Married	\N	\N	\N	Nagamapal Kangjabi Leirak, Imphal East-795001	Nagamapal Kangjabi Leirak, Imphal East-795001	[{"year": "2004", "grade": "Passed", "institution": "NIOS", "qualification": "X"}, {"year": "2012", "grade": "Passed", "institution": "Sunderdeep International Institute of Hotel Management, Lucknow", "qualification": "Diploma in culinary Arts & Cookeries "}]	[]	\N			2025-09-27		Hinduism	[]					2026-08-12 11:14:34.197533	2026-08-12 11:14:34.197533	Indian			[]	[{"name": "Late Sanasam Mangi", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Sanasam Thasana", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Maibam Nilimika", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
143	92	1	1985-02-01	Male	Married	\N	\N	\N	Kakwa Sairom Leirak, Imphal East-795008	Kakwa Sairom Leirak, Imphal East-795008	[{"year": "2003", "grade": "Passed", "institution": "Canchipu High School", "qualification": "X"}]	[]	\N			2013-06-01		Hinduism	[]					2026-08-13 06:08:27.360023	2026-08-13 06:08:27.360023	Indian			[]	[{"name": "Irengbam Kunjabi Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Irengbam(O) Ibemhal Singh", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Irengbam(O) Sunita Devi", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
144	93	1	1999-12-17	Male	Single	\N	\N	\N	Palace Compound, Thangapat Mapal, Imphal East-795001	Khuga Meitei Christian Leikai, Churachandpur-795128	[{"year": "2015", "grade": "Second Division", "institution": "Sielmat Christian High School", "qualification": "X"}, {"year": "2017", "grade": "Second Division", "institution": "Sielmat Christian High School", "qualification": "XII"}]	[]	\N			2022-12-01		Hinduism	[]					2026-08-13 11:21:21.169885	2026-08-13 11:21:21.169885	Indian			[]	[{"name": "Khwairakpam Ibomcha", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Khwairakpam Kumudini", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
145	94	1	2005-03-02	Female	Single	\N	\N	\N	Thiyam Leishangkhong, Imphal West-795009	Thiyam Leishangkhong, Imphal West-795009	[{"year": "2022", "grade": "Passed", "institution": "Helping Hands Group Academy, Ghari", "qualification": "XII"}, {"year": "2020", "grade": "Passed", "institution": "The Brilliat Public School, Samurou", "qualification": "X"}, {"year": "2025", "grade": "Passed", "institution": "Nightingale Nursing Institute", "qualification": "GNM"}]	[]	\N			2025-12-05		Hinduism	[]					2026-08-13 11:33:36.191347	2026-08-13 11:33:36.191347	Indian			[]	[{"name": "Longjam Biren", "ageDob": "70", "contactNo": "", "relationship": "Father"}, {"name": "Longjam(O) Angoubi", "ageDob": "60", "contactNo": "", "relationship": "Mother"}]
146	95	1	1999-03-23	Male	Single	\N	\N	\N	Chingtham Mamang Leikai, Khongjom, Thoubal-795148	Chingtham Mamang Leikai, Khongjom, Thoubal-795148	[{"year": "2014", "grade": "First Division", "institution": "Khongjom Standard English School", "qualification": "HSLC"}, {"year": "2016", "grade": "Grade A", "institution": "Vision Creative School of Science Thoubal", "qualification": "HSE"}]	[]	\N			2020-02-02		Hinduism	[]					2026-08-16 07:00:18.01435	2026-08-16 07:00:18.01435	Indian			[]	[{"name": "Sapam Babu Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Sapam(O) Ibema Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
147	96	1	2004-02-01	Male	Married	\N	\N	\N	Thangmeiband Tarung, Imphal West	Nungnamg Village, Nungba	[{"year": "2023", "grade": "Third Division", "institution": "Tengkonjang Higher Seconadry School", "qualification": "HSE"}]	[]	\N			2017-07-01		Christianity	[]					2026-08-16 07:18:09.856444	2026-08-16 07:18:09.856444	Indian			[]	[{"name": "Kairong Phaomei", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Kadingailiu Phaomei", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Ashaliu", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
148	97	1	2002-10-10	Female	Single	\N	\N	\N	Singjamei Okram Leikai, Imphal West-795008	Singjamei Okram Leikai, Imphal West-795008	[{"year": "2019", "grade": "Second Division", "institution": "Keishamthong High School", "qualification": "HSLC"}, {"year": "2021", "grade": "Second Division", "institution": "Brajalal Institute of Science", "qualification": "HSE"}, {"year": "2023", "grade": "First Division", "institution": "Mewar University", "qualification": "DMLT"}]	[]	\N			2025-10-01		Hinduism	[]					2026-08-16 10:51:46.968597	2026-08-16 10:51:46.968597	Indian			[]	[{"name": "Okram Jugindro Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Okram Bina Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
149	98	1	1999-01-12	Female	Single	\N	\N	\N	Singjamei Chingamathak, Imphal West-795001	Singjamei Chingamathak, Imphal West-795001	[{"year": "2014", "grade": "Passed", "institution": "North Point Hr. Sec School", "qualification": "AISSE"}]	[]	\N			2026-02-23		Hinduism	[]					2026-08-16 11:09:44.118908	2026-08-16 11:09:44.118908	Indian			[]	[{"name": "Thokchom Shashikumar Sigh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Thokchom(O) Sobita Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
150	99	1	2004-03-03	Male	Single	\N	\N	\N	Singjamei Wangma Kshetri Leikai Mongkhang Lambi, Imphal East-795008	Singjamei Wangma Kshetri Leikai Mongkhang Lambi, Imphal East-795008	[{"year": "2022", "grade": "First Division", "institution": "Aimol Chingnunghut High School", "qualification": "HSLC"}]	[]	\N			2024-04-13		Christianity	[]					2026-08-16 11:17:40.035262	2026-08-16 11:17:40.035262	Indian			[]	[{"name": "Ongnam Naobi Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Ongnam Premabati Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
151	100	1	2006-04-02	Male	Single	\N	\N	\N	Langathel Moirang Leikai, Thoubal District-795148	Langathel Moirang Leikai, Thoubal District-795148	[{"year": "2022", "grade": "Second Division", "institution": "Langathel High School, Thoubal", "qualification": "HSLC"}, {"year": "2024", "grade": "Passed", "institution": "Rural Academy Wangjing", "qualification": "XII"}]	[]	\N			2026-07-17		Hinduism	[]					2026-08-16 11:27:52.565681	2026-08-16 11:27:52.565681	Indian			[]	[{"name": "Nepram Somon Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Nepram Chaoba Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
152	101	1	2007-02-03	Male	Single	\N	\N	\N	Singjamei Wangma Kshetri Leikai Mongkhang Lambi, Imphal East-795008	Singjamei Wangma Kshetri Leikai Mongkhang Lambi, Imphal East-795008	[{"year": "2022", "grade": "Passed", "institution": "S. Chaoba Memorial English School", "qualification": "HSLC"}, {"year": "2024", "grade": "Passed", "institution": "Johnstone Higher Secondary School", "qualification": "HSE"}, {"year": "", "grade": "", "institution": "", "qualification": ""}]	[]	\N			2025-04-01		Hinduism	[]					2026-08-16 11:38:01.074689	2026-08-16 11:38:01.074689	Indian			[]	[{"name": "Beishamayum Ranbir Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Beishamayum(O) Sunibala Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
153	102	1	1983-03-01	Female	Widowed	\N	\N	\N	Bamon Leikai Mange Makhong Leirak-Imphal East 795005	Bamon Leikai Mange Makhong Leirak-Imphal East 795005	[]	[]	\N			2026-03-02		Hinduism	[]					2026-08-17 05:15:28.348775	2026-08-17 05:15:28.348775	Indian			[]	[{"name": "Ningombam Poke Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Ningombam", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Late Takhenchangbam Sanjoy Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
154	103	1	2007-07-01	Male	Single	\N	\N	\N	Singjamei Wangma Kshetri Leikai Mongkhang Lambi, Imphal East-795008	Singjamei Wangma Kshetri Leikai Mongkhang Lambi, Imphal East-795008	[{"year": "2023", "grade": "50.8%", "institution": "South Point School of Science", "qualification": "HSLC"}, {"year": "2025", "grade": "Second Division", "institution": "St. Stephen Higher Sec. School", "qualification": "HSE"}]	[]	\N			2007-07-01		Hinduism	[]					2026-08-17 08:46:19.916442	2026-08-17 08:46:19.916442	Indian			[]	[{"name": "Ongnam Ithoi Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Ongnam Ranjita Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
155	104	1	1988-02-14	Female	Single	\N	\N	\N	Sagolband Moirang Hanuba Lai Leirak, Imphal West-795001	Sagolband Moirang Hanuba Lai Leirak, Imphal West-795001	[{"year": "2003", "grade": "38.6%", "institution": "Recent Higher Secondary School", "qualification": "HSLC"}, {"year": "2005", "grade": "51.4%", "institution": "Ananda Singh Higher Secondary", "qualification": "HSSLC"}, {"year": "2009", "grade": "45.5%", "institution": "D.M College of Arts", "qualification": "Graduate"}, {"year": "2009", "grade": "69.10%", "institution": "Govt. Polytechnic, Imphal", "qualification": "Diploma in Pharmacy"}]	[]	\N			2013-07-23		Hinduism	[]					2026-08-19 05:24:47.818361	2026-08-19 05:24:47.818361	Indian			[]	[{"name": "Soubam Kalachand Meitei", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Soubam(O) Ashangbi Leima", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
156	105	1	1982-02-01	Male	Married	\N	\N	\N	Hiyangthang Makha Leikai, Imphal West-795009	Hiyangthang Makha Leikai, Imphal West-795009	[{"year": "1997", "grade": "Passed", "institution": "Kumari High School", "qualification": "VIII"}]	[]	\N			2018-02-19		Hinduism	[]					2026-08-19 06:40:14.92818	2026-08-19 06:40:14.92818	Indian			[]	[{"name": "Loitongbam Nongthon Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Loitongbam(O) Landhoni Dev", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Loitongbam(O) Somola Devi", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
157	106	1	1996-11-02	Male	Married	\N	\N	\N	Sangomsang Litan Makhong, Imphal East-795010	Sangomsang Litan Makhong, Imphal East-795010	[{"year": "2011", "grade": "Passed", "institution": "Sawombung High School", "qualification": "VIII"}]	[]	\N			2025-11-20		Sanamahism	[]					2026-08-19 06:53:06.879756	2026-08-19 06:53:06.879756	Indian			[]	[{"name": "Khoisnam Manglem Meitei", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Late Khoisnam(O) Khomdon", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Saikhom Sanayanbi ", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
158	107	1	1955-01-01	Male	Married	\N	\N	\N	Ningombam Awang Leikai, Imphal West-795003	Ningombam Awang Leikai, Imphal West-795003	[{"year": "1984", "grade": "Third Division", "institution": "Ningombam High School", "qualification": "HSLC"}]	[]	\N			2022-07-21		Hinduism	[]					2026-08-19 07:08:49.379974	2026-08-19 07:08:49.379974	Indian			[]	[{"name": "Phurailatpam Modhumangol", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Phurailatpam Kunjeshori Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Phurailatpam Shandhya", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
159	108	1	1972-11-29	Female	Widowed	\N	\N	\N	Bashikhong Mamang Leikai, Imphal East-795008	Bashikhong Mamang Leikai, Imphal East-795008	[{"year": "1988", "grade": "Passed", "institution": "Yumnam Leikai High School", "qualification": "VIII"}]	[]	\N			2018-09-01		Hinduism	[]					2026-08-19 07:59:58.731562	2026-08-19 07:59:58.731562	Indian			[]	[{"name": "Late Khangembam Raja", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Oinam Memchoubi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Late Nameirakpam Guni", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
160	109	1	1981-01-01	Female	Married	\N	\N	\N	Singjamei Chingamakha Okram Leirak, Imphal West	Singjamei Chingamakha Okram Leirak, Imphal West	[{"year": "1997", "grade": "Passed", "institution": "The Tera Kebol Girls' High School", "qualification": "VIII"}]	[]	\N			2013-12-07		Hinduism	[]					2026-08-19 09:45:50.603235	2026-08-19 09:45:50.603235	Indian			[]	[{"name": "Maibam Kumar Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Maibam(O)", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Kshetrimayum Manglemba ", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
161	110	1	1965-05-21	Female	Married	\N	\N	\N	Nongmeibung Purana Rajbari Part 1, Imphal East-795001	Nongmeibung Purana Rajbari Part 1, Imphal East-795001	[]	[]	\N			2014-02-12		Hinduism	[]					2026-08-19 09:57:32.898113	2026-08-19 09:57:32.898113	Indian			[]	[{"name": "Rajkumar Chinglensana", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Late Rajkumari Bormani", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Rajkumar Chinglensana Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
162	111	1	1978-04-04	Female	Widowed	\N	\N	\N	Singjamei Wangma Bheigyabati Leikai Kongba Road-Imphal East	Singjamei Wangma Bheigyabati Leikai Kongba Road-Imphal East	[{"year": "1994", "grade": "Passed", "institution": "Kakching Khunou High School", "qualification": "HSLC"}, {"year": "1999", "grade": "Passed", "institution": "The Maharaja Bodhachandra College", "qualification": "Graduate"}]	[]	\N			2019-05-22		Hinduism	[]					2026-08-19 10:10:03.989881	2026-08-19 10:10:03.989881	Indian			[]	[{"name": "Laishram Radhamani Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Laishram(O)", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Late Naorem Somorjit Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
163	112	1	1983-04-01	Female	Married	\N	\N	\N	Moidangpok Aheibam Leikai, Imphal West	Moidangpok Aheibam Leikai, Imphal West	[{"year": "1998", "grade": "52%", "institution": "BOSEM", "qualification": "HSLC"}, {"year": "2001", "grade": "42%", "institution": "COHSEM", "qualification": "HSSLC"}, {"year": "2007", "grade": "48%", "institution": "Manipur University", "qualification": "Graduate"}]	[]	\N			2016-11-03		Hinduism	[]					2026-08-19 10:42:56.729481	2026-08-19 10:42:56.729481	Indian			[]	[{"name": "Late Nongmaithem Gambhirchand Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Nongmaithem Sanayai Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Aheibam Devjit", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
164	113	1	2002-02-28	Female	Married	\N	\N	\N	Khurai,Imphal East-795010	Khurai,Imphal East-795010	[{"year": "2017", "grade": "Passed", "institution": "R.K. Sanatombi Devi Vidyala", "qualification": "HSLC"}, {"year": "2019", "grade": "Passed", "institution": "Delta Advance School", "qualification": "HSE"}]	[]	\N			2024-03-16		Hinduism	[]					2026-08-19 10:59:09.596059	2026-08-19 10:59:09.596059	Indian			[]	[{"name": "Arubam Goi Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Tourangbam ", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Thongam Chitaranjan Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
165	108	2	1972-11-29	Female	Widowed	\N	\N	\N	Bashikhong Mamang Leikai, Imphal East-795008	Bashikhong Mamang Leikai, Imphal East-795008	[{"year": "1988", "grade": "Passed", "institution": "Yumnam Leikai High School", "qualification": "VIII"}]	[]	\N			2018-09-01		Hinduism	[]					2026-08-20 05:21:00.519787	2026-08-20 05:21:00.519787	Indian			[]	[{"name": "Late Khangembam Raja", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Oinam Memchoubi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Late Nameirakpam Guni", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
166	111	2	1978-04-04	Female	Widowed	\N	\N	\N	Singjamei Wangma Bheigyabati Leikai Kongba Road-Imphal East	Singjamei Wangma Bheigyabati Leikai Kongba Road-Imphal East	[{"year": "1994", "grade": "Passed", "institution": "Kakching Khunou High School", "qualification": "HSLC"}, {"year": "1999", "grade": "Passed", "institution": "The Maharaja Bodhachandra College", "qualification": "Graduate"}]	[]	\N			2019-05-22		Hinduism	[]					2026-08-20 05:21:25.159554	2026-08-20 05:21:25.159554	Indian			[]	[{"name": "Laishram Radhamani Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Laishram(O)", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Late Naorem Somorjit Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
167	110	2	1965-05-21	Female	Married	\N	\N	\N	Nongmeibung Purana Rajbari Part 1, Imphal East-795001	Nongmeibung Purana Rajbari Part 1, Imphal East-795001	[]	[]	\N			2014-02-12		Hinduism	[]					2026-08-20 05:21:41.076719	2026-08-20 05:21:41.076719	Indian			[]	[{"name": "Rajkumar Chinglensana", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Late Rajkumari Bormani", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Rajkumar Chinglensana Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
168	109	2	1981-01-01	Female	Married	\N	\N	\N	Singjamei Chingamakha Okram Leirak, Imphal West	Singjamei Chingamakha Okram Leirak, Imphal West	[{"year": "1997", "grade": "Passed", "institution": "The Tera Kebol Girls' High School", "qualification": "VIII"}]	[]	\N			2013-12-07		Hinduism	[]					2026-08-20 05:22:08.169303	2026-08-20 05:22:08.169303	Indian			[]	[{"name": "Maibam Kumar Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Maibam(O)", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Kshetrimayum Manglemba ", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
169	114	1	1969-03-01	Female	Married	\N	\N	\N	Nongmeibung Purana Rajbari Part 1, Imphal East-795001	Nongmeibung Purana Rajbari Part 1, Imphal East-795001	[{"year": "1982", "grade": "Passed", "institution": "Ningombam Junior High School, Thoubal", "qualification": "VIII"}]	[]	\N			2013-11-26			[]					2026-08-20 05:39:51.842195	2026-08-20 05:39:51.842195	Indian			[]	[{"name": "Shoibam Chaoyaima Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Shoibam(O) Angoubi Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "R.K. Ratan Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
170	113	2	2002-02-28	Female	Married	\N	\N	\N	Khurai,Imphal East-795010	Khurai,Imphal East-795010	[{"year": "2017", "grade": "Passed", "institution": "R.K. Sanatombi Devi Vidyala", "qualification": "HSLC"}, {"year": "2019", "grade": "Passed", "institution": "Delta Advance School", "qualification": "HSE"}]	[]	\N			2024-03-16		Hinduism	[]					2026-08-20 05:43:32.406834	2026-08-20 05:43:32.406834	Indian			[]	[{"name": "Arubam Goi Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Tourangbam ", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Thongam Chitaranjan Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
171	112	2	1983-04-01	Female	Married	\N	\N	\N	Moidangpok Aheibam Leikai, Imphal West	Moidangpok Aheibam Leikai, Imphal West	[{"year": "1998", "grade": "52%", "institution": "BOSEM", "qualification": "HSLC"}, {"year": "2001", "grade": "42%", "institution": "COHSEM", "qualification": "HSSLC"}, {"year": "2007", "grade": "48%", "institution": "Manipur University", "qualification": "Graduate"}]	[]	\N			2016-11-03		Hinduism	[]					2026-08-20 05:44:34.862104	2026-08-20 05:44:34.862104	Indian			[]	[{"name": "Late Nongmaithem Gambhirchand Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Nongmaithem Sanayai Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Aheibam Devjit", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
172	113	3	2002-02-28	Female	Married	\N	\N	\N	Khurai,Imphal East-795010	Khurai,Imphal East-795010	[{"year": "2017", "grade": "Passed", "institution": "R.K. Sanatombi Devi Vidyala", "qualification": "HSLC"}, {"year": "2019", "grade": "Passed", "institution": "Delta Advance School", "qualification": "HSE"}]	[]	\N			2024-03-16		Hinduism	[]					2026-08-20 05:54:25.064775	2026-08-20 05:54:25.064775	Indian			[]	[{"name": "Arubam Goi Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Tourangbam ", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Thongam Chitaranjan Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
173	115	1	1988-10-06	Female	Married	\N	\N	\N	Khurai Ahongei Leikai, Imphal East-795010	Khurai Ahongei Leikai, Imphal East-795010	[{"year": "2005", "grade": "Passed", "institution": "St. Xavier English School, Imphal", "qualification": "VIII"}]	[]	\N			2019-07-01		Hinduism	[]					2026-08-20 06:01:37.468597	2026-08-20 06:01:37.468597	Indian			[]	[{"name": "Hanjabam Raghumani Sharma", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Hanjabam ", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Irom Premjit Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
174	116	1	1983-03-01	Female	Married	\N	\N	\N	Wangkhei Ningthem Pukhri Mapal, Imphal East	Wangkhei Ningthem Pukhri Mapal, Imphal East	[{"year": "1998", "grade": "Passed", "institution": "Manipur Rural Institute High School", "qualification": "HSLC"}, {"year": "2004", "grade": "Passed", "institution": "The Oriental College, Imphal", "qualification": "BSc. General"}, {"year": "2000", "grade": "Second division", "institution": "The Western College, Konthoujam", "qualification": "HSE"}]	[]	\N			2025-05-19		Hinduism	[]					2026-08-20 06:42:21.069523	2026-08-20 06:42:21.069523	Indian			[]	[{"name": "Kongkham Ananda Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Kongkham(O) Radha Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Sairem Loyanganba Meitei", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
175	117	1	1977-03-01	Female	Widowed	\N	\N	\N	Thangmeiband Hijam Dewan Leikai, Imphal West-795001	Thangmeiband Hijam Dewan Leikai, Imphal West-795001	[{"year": "1989", "grade": "Passed", "institution": "Adimjati Little English School", "qualification": "VIII"}]	[]	\N			2014-02-08		Hinduism	[]					2026-08-20 08:34:14.690737	2026-08-20 08:34:14.690737	Indian			[]	[{"name": "Maibam Kumar Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Late Maibam(O) Ibempishak Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Late Thokchom Sanaton Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
176	118	1	1972-01-01	Female	Married	\N	\N	\N	Brahmapur Nahabam, Imphal East-795005	Brahmapur Nahabam, Imphal East-795005	[{"year": "1994", "grade": "Passed", "institution": "Keishamthong Girls'  High School", "qualification": "VIII"}]	[]	\N			2015-09-01		Hinduism	[]					2026-08-20 09:05:26.407141	2026-08-20 09:05:26.407141	Indian			[]	[{"name": "Laimayum Birjit Sharma", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Laimayum", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Choudhurimayum Mosana Sharma", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
177	119	1	1987-06-13	Female	Married	\N	\N	\N	Brahmapur Thangapat Mapal Lakpam Leirak, Imphal East	Brahmapur Thangapat Mapal Lakpam Leirak, Imphal East	[{"year": "2002", "grade": "Passed", "institution": "Eastern Ideal High School", "qualification": "VIII"}]	[]	\N			2019-06-05		Hinduism	[]					2026-08-20 09:24:39.338845	2026-08-20 09:24:39.338845	Indian			[]	[{"name": "Mathurabasimayum Joy Sharma", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Takhelchangbam Dhani Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Laimayum Anil Sharma", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
178	120	1	1978-03-30	Female	Married	\N	\N	\N	Khurai Thoidingjam  Leikai, Imphal East-795010	Khurai Thoidingjam  Leikai, Imphal East-795010	[{"year": "1992", "grade": "Third Division", "institution": "The Shining School, Khundrakpam", "qualification": "VIII"}]	[]	\N			2019-05-13		Hinduism	[]					2026-08-20 09:42:33.02095	2026-08-20 09:42:33.02095	Indian			[]	[{"name": "Khuraijam Joy Meetei", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Khuraijam(O) Ibeyaima Leima", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Chanam Ganeshwor Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
179	121	1	2004-03-07	Female	Single	\N	\N	\N	Uripok Khaidem Leikai, Imphal West-795001	Uripok Khaidem Leikai, Imphal West-795001	[{"year": "2019", "grade": "Second Division", "institution": "St. Dominic Savio School", "qualification": "HSLC"}, {"year": "2021", "grade": "First Division", "institution": "Brilliance School", "qualification": "HSE"}, {"year": "2014", "grade": "First Division", "institution": "Irengbam Thamcha Devi Nursing & Healthcare Research Institute", "qualification": "BSc. MLT"}]	[]	\N			2026-04-01		Hinduism	[]					2026-08-20 09:57:07.645803	2026-08-20 09:57:07.645803	Indian			[]	[{"name": "Late Maimom Bocha Khuman", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Loukrakpam Rinarsi Chanu", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
180	42	3	1994-03-10	Female	Married	\N	\N	\N	Khongman Bashikhong, Imphal East-795008	Khongman Bashikhong, Imphal East-795008	[{"year": "2011", "grade": "First Division", "institution": "Advance Innovative Modern School, Khongman Mangjil", "qualification": "HSSLC"}, {"year": "2019", "grade": "First Division", "institution": "Alvas Homeopathic Medical College", "qualification": "BHMS"}, {"year": "2009", "grade": "Second division", "institution": "St. George High School", "qualification": "HSLC"}]	[]	\N			2020-07-21		Hinduism	[{"name":"Kangujam Rajiv Singh","percentage":100,"relationship":"Spouse"}]					2026-08-20 10:16:20.722444	2026-08-20 10:16:20.722444	Indian			[]	[{"name": "Kangujam Rajiv Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}, {"name": "Takhenchangbam Ishingchaoba Sharma", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Takhenchangbam", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
181	122	1	2007-03-04	Male	Single	\N	\N	\N	Langathel Mayai Leikai, Thoubal District-795148	Langathel Mayai Leikai, Thoubal District-795148	[{"year": "2022", "grade": "First Division", "institution": "Secred Shine English School", "qualification": "HSLC"}, {"year": "2024", "grade": "First Division", "institution": "Vision Creative School of Science Thoubal", "qualification": "HSE"}]	[]	\N			2026-07-15		Hinduism	[]					2026-08-21 05:19:28.272812	2026-08-21 05:19:28.272812	Indian			[]	[{"name": "Sagolsem Manaobi Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Sagolsem Manitombi Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
182	123	1	2004-03-06	Male	Single	\N	\N	\N	Langathel Moirang Leikai, Thoubal District-795148	Langathel Moirang Leikai, Thoubal District-795148	[{"year": "2020", "grade": "First Division", "institution": "Shining Academy", "qualification": "HSLC"}, {"year": "2022", "grade": "First Division", "institution": "New Era Academy", "qualification": "HSSLC"}]	[]	\N			2026-07-17		Hinduism	[]					2026-08-21 05:28:59.591006	2026-08-21 05:28:59.591006	Indian			[]	[{"name": "Puyam Nandajoy Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Puyam Ibemcha Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
183	124	1	1991-07-18	Female	Married	\N	\N	\N	Brahmapur Nahabam, Imphal East-795005	Brahmapur Nahabam, Imphal East-795005	[]	[]	\N			2026-01-02		Hinduism	[]					2026-08-21 10:27:35.023623	2026-08-21 10:27:35.023623	Indian			[]	[{"name": "Kangabam Maipak", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Kangabam(O) Mema", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Haobam Malemnganba", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
184	125	1	2004-03-27	Male	Single	\N	\N	\N	Ningombam Mayai Leikai, Imphal West-795003	Ningombam Mayai Leikai, Imphal West-795003	[{"year": "2018", "grade": "Passed", "institution": "Jawahar Navodaya Vidyalaya, Khumbong, Imphal West", "qualification": "X"}, {"year": "2020", "grade": "Passed", "institution": "Imphal Valley Academy, Ghari, Imphal West", "qualification": "HSE"}, {"year": "2023", "grade": "Passed", "institution": "Manipur College", "qualification": "Graduate"}]	[]	\N			2026-02-01		Hinduism	[]					2026-08-21 10:37:54.205178	2026-08-21 10:37:54.205178	Indian			[]	[{"name": "Mutum Kullabidhu Meetei", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Thokchom Irabati Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
185	126	1	1989-03-01	Female	Single	\N	\N	\N	Tronglaobi Awang Leikai, Bishnupur-795133	Tronglaobi Awang Leikai, Bishnupur-795133	[{"year": "1996", "grade": "Passed", "institution": "Moirang Girls' High School", "qualification": "VIII"}]	[]	\N			2023-12-01		Hinduism	[]					2026-08-21 10:44:18.865213	2026-08-21 10:44:18.865213	Indian			[]	[{"name": "Late Oinam Kunjo Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Late Oinam Mani Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}]
186	127	1	1994-01-03	Male	Married	\N	\N	\N	Bamon Kampu Khabam, Imphal East-795008	Bamon Kampu Khabam, Imphal East-795008	[]	[]	\N			2016-01-16		Hinduism	[]					2026-08-21 10:56:33.722112	2026-08-21 10:56:33.722112	Indian			[]	[{"name": "Elangbam Koroba", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Elangbam Padamukhi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Elangbam(O) Purnimashi", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
187	128	1	1995-01-17	Male	Married	\N	\N	\N	Bir Mani Para, VTC, Longtarai R.F, Dhalai District, Tripura	Bir Mani Para, VTC, Longtarai R.F, Dhalai District, Tripura	[]	[]	\N			2025-09-10		Hinduism	[]					2026-08-23 04:34:52.744448	2026-08-23 04:34:52.744448	Indian			[]	[{"name": "Patindra Tripura", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Chakrengti Tripura", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Katadinliu Kamei", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
188	129	1	1988-02-01	Male	Married	\N	\N	\N	Khagempalli Huidrom Leikai, Imphal West-795001	Khagempalli Huidrom Leikai, Imphal West-795001	[{"year": "2005", "grade": "Third Division", "institution": "Mahatma Gandhi Smarak High School", "qualification": "HSLC"}, {"year": "2007", "grade": "Passed", "institution": "Rabi School of Nursing", "qualification": "ANM"}]	[]	\N			2013-12-12		Hinduism	[]	MNC-402/2010				2026-08-23 04:54:42.154215	2026-08-23 04:54:42.154215	Indian			[]	[{"name": "Kangjam Sushilkumar Singh", "ageDob": "", "contactNo": "", "relationship": "Father"}, {"name": "Late Khaidem Radhapyari Devi", "ageDob": "", "contactNo": "", "relationship": "Mother"}, {"name": "Wangkhem Bishankumar Singh", "ageDob": "", "contactNo": "", "relationship": "Spouse"}]
\.


--
-- Data for Name: staff_off_day_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_off_day_requests (id, staff_id, original_date, requested_date, reason, status, reviewed_by_id, reviewer_note, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: staff_salaries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_salaries (id, staff_id, staff_version, basic_salary, hra, conveyance, special, epf, esi, professional_tax, other_deductions, late_attendance, bank_name, account_number, ifsc_code, created_at, updated_at, skill_allowance, deduct_tds, tds_percent, tds, security_deposit_total, security_deposit, security_deposit_start_month) FROM stdin;
1	1	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-14 10:36:30.073422	2026-07-14 10:36:30.073422	0.00	f	10.00	0.00	0.00	0.00	\N
2	2	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-14 11:05:10.04269	2026-07-14 11:05:10.04269	0.00	f	10.00	0.00	0.00	0.00	\N
3	1	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-14 11:09:06.589678	2026-07-14 11:09:06.589678	0.00	f	10.00	0.00	0.00	0.00	\N
4	3	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-14 11:29:35.635514	2026-07-14 11:29:35.635514	0.00	f	10.00	0.00	0.00	0.00	\N
5	4	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-14 11:42:03.340446	2026-07-14 11:42:03.340446	0.00	f	10.00	0.00	0.00	0.00	\N
6	5	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-14 11:46:04.813456	2026-07-14 11:46:04.813456	0.00	f	10.00	0.00	0.00	0.00	\N
39	5	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-15 05:50:51.389159	2026-07-15 05:50:51.389159	0.00	f	10.00	0.00	0.00	0.00	\N
40	5	3	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-15 05:55:52.823015	2026-07-15 05:55:52.823015	0.00	f	10.00	0.00	0.00	0.00	\N
41	4	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-15 06:01:58.420405	2026-07-15 06:01:58.420405	0.00	f	10.00	0.00	0.00	0.00	\N
42	3	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000087	BKID0005042	2026-07-15 06:04:12.277237	2026-07-15 06:04:12.277237	0.00	f	10.00	0.00	0.00	0.00	\N
43	4	3	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-15 06:24:45.595068	2026-07-15 06:24:45.595068	0.00	f	10.00	0.00	0.00	0.00	\N
44	2	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-15 06:28:17.39188	2026-07-15 06:28:17.39188	0.00	f	10.00	0.00	0.00	0.00	\N
45	6	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-15 06:52:32.219882	2026-07-15 06:52:32.219882	0.00	f	10.00	0.00	0.00	0.00	\N
46	6	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000005	BKID0005042	2026-07-16 04:30:14.849395	2026-07-16 04:30:14.849395	0.00	f	10.00	0.00	0.00	0.00	\N
47	7	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000037	BKID0005042	2026-07-16 04:43:58.26836	2026-07-16 04:43:58.26836	0.00	f	10.00	0.00	0.00	0.00	\N
48	7	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000037	BKID0005042	2026-07-16 06:06:13.159962	2026-07-16 06:06:13.159962	0.00	f	10.00	0.00	0.00	0.00	\N
49	8	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	20131064284	SBIN00161013	2026-07-16 06:25:55.548095	2026-07-16 06:25:55.548095	0.00	f	10.00	0.00	0.00	0.00	\N
50	8	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	20131064284	SBIN00161013	2026-07-16 06:26:37.270394	2026-07-16 06:26:37.270394	0.00	f	10.00	0.00	0.00	0.00	\N
51	9	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	45176717807	SBIN0007440	2026-07-16 07:07:30.341973	2026-07-16 07:07:30.341973	0.00	f	10.00	0.00	0.00	0.00	\N
52	10	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000341	BKID0005042	2026-07-16 09:32:45.696587	2026-07-16 09:32:45.696587	0.00	f	10.00	0.00	0.00	0.00	\N
53	11	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-16 11:57:21.601735	2026-07-16 11:57:21.601735	0.00	f	10.00	0.00	0.00	0.00	\N
54	11	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-16 11:59:55.366225	2026-07-16 11:59:55.366225	0.00	f	10.00	0.00	0.00	0.00	\N
55	10	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000341	BKID0005042	2026-07-16 12:03:39.790631	2026-07-16 12:03:39.790631	0.00	f	10.00	0.00	0.00	0.00	\N
56	12	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216310000051	BKID0005042	2026-07-16 12:37:30.441535	2026-07-16 12:37:30.441535	0.00	f	10.00	0.00	0.00	0.00	\N
57	13	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000014	BKID0005042	2026-07-17 05:20:49.895205	2026-07-17 05:20:49.895205	0.00	f	10.00	0.00	0.00	0.00	\N
58	14	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000339	BKID0005042	2026-07-17 06:57:51.04844	2026-07-17 06:57:51.04844	0.00	f	10.00	0.00	0.00	0.00	\N
59	15	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	43025039521	SBIN0063860	2026-07-17 11:08:28.33394	2026-07-17 11:08:28.33394	0.00	f	10.00	0.00	0.00	0.00	\N
60	16	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-17 11:38:08.040731	2026-07-17 11:38:08.040731	0.00	f	10.00	0.00	0.00	0.00	\N
61	17	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-18 05:11:12.62565	2026-07-18 05:11:12.62565	0.00	f	10.00	0.00	0.00	0.00	\N
62	18	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Central Bank of India 	3797975740	CBIN0284916	2026-07-18 05:35:35.627118	2026-07-18 05:35:35.627118	0.00	f	10.00	0.00	0.00	0.00	\N
63	18	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Central Bank of India 	3797975740	CBIN0284916	2026-07-18 05:37:24.293091	2026-07-18 05:37:24.293091	0.00	f	10.00	0.00	0.00	0.00	\N
64	19	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	33276641661	SBIN0064728	2026-07-18 06:00:00.965556	2026-07-18 06:00:00.965556	0.00	f	10.00	0.00	0.00	0.00	\N
65	19	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	33276641661	SBIN0064728	2026-07-18 06:04:03.824197	2026-07-18 06:04:03.824197	0.00	f	10.00	0.00	0.00	0.00	\N
66	20	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-18 07:05:49.988922	2026-07-18 07:05:49.988922	0.00	f	10.00	0.00	0.00	0.00	\N
67	20	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-18 07:07:52.562581	2026-07-18 07:07:52.562581	0.00	f	10.00	0.00	0.00	0.00	\N
68	21	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-18 08:46:25.06238	2026-07-18 08:46:25.06238	0.00	f	10.00	0.00	0.00	0.00	\N
69	22	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	43437833017	SBIN0019133	2026-07-18 09:00:30.543922	2026-07-18 09:00:30.543922	0.00	f	10.00	0.00	0.00	0.00	\N
70	23	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Manipur Rural Bank 	9001010127080	PUNBORRBMRB	2026-07-18 09:17:02.876127	2026-07-18 09:17:02.876127	0.00	f	10.00	0.00	0.00	0.00	\N
71	24	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	42908447741	SBIN0064378	2026-07-18 11:05:01.709199	2026-07-18 11:05:01.709199	0.00	f	10.00	0.00	0.00	0.00	\N
72	25	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Axis Bank	921010010763260	UTIB0000289	2026-07-18 11:12:50.940107	2026-07-18 11:12:50.940107	0.00	f	10.00	0.00	0.00	0.00	\N
73	26	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Manipur Rural Bank 	9012010071576	UTIBORRBMRB	2026-07-18 11:20:48.787579	2026-07-18 11:20:48.787579	0.00	f	10.00	0.00	0.00	0.00	\N
74	27	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 03:03:40.632947	2026-07-19 03:03:40.632947	0.00	f	10.00	0.00	0.00	0.00	\N
75	28	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 03:55:58.887638	2026-07-19 03:55:58.887638	0.00	f	10.00	0.00	0.00	0.00	\N
76	29	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 04:18:14.9616	2026-07-19 04:18:14.9616	0.00	f	10.00	0.00	0.00	0.00	\N
77	30	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000088	BKID0005042	2026-07-19 05:29:07.01287	2026-07-19 05:29:07.01287	0.00	f	10.00	0.00	0.00	0.00	\N
78	31	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 05:48:50.064709	2026-07-19 05:48:50.064709	0.00	f	10.00	0.00	0.00	0.00	\N
79	31	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	39811951923	SBIN0005320	2026-07-19 05:52:20.672498	2026-07-19 05:52:20.672498	0.00	f	10.00	0.00	0.00	0.00	\N
80	32	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	39006522581	SBIN0011626	2026-07-19 07:37:13.705743	2026-07-19 07:37:13.705743	0.00	f	10.00	0.00	0.00	0.00	\N
81	33	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 09:04:52.035353	2026-07-19 09:04:52.035353	0.00	f	10.00	0.00	0.00	0.00	\N
82	34	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 10:04:47.891951	2026-07-19 10:04:47.891951	0.00	f	10.00	0.00	0.00	0.00	\N
83	35	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	32179873860	SBIN0007440	2026-07-19 10:19:50.4806	2026-07-19 10:19:50.4806	0.00	f	10.00	0.00	0.00	0.00	\N
84	36	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	35138342698	SBIN0017403	2026-07-19 10:51:25.843582	2026-07-19 10:51:25.843582	0.00	f	10.00	0.00	0.00	0.00	\N
85	37	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 11:01:25.619179	2026-07-19 11:01:25.619179	0.00	f	10.00	0.00	0.00	0.00	\N
86	38	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000295	BKID0005042	2026-07-19 11:14:37.650164	2026-07-19 11:14:37.650164	0.00	f	10.00	0.00	0.00	0.00	\N
87	39	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	44333213185	SBIN0017403	2026-07-19 11:32:00.123248	2026-07-19 11:32:00.123248	0.00	f	10.00	0.00	0.00	0.00	\N
88	40	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	34091787087	SBIN0017403	2026-07-19 11:51:01.273276	2026-07-19 11:51:01.273276	0.00	f	10.00	0.00	0.00	0.00	\N
89	41	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 11:58:06.166793	2026-07-19 11:58:06.166793	0.00	f	10.00	0.00	0.00	0.00	\N
90	41	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-19 12:02:01.846926	2026-07-19 12:02:01.846926	0.00	f	10.00	0.00	0.00	0.00	\N
91	42	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000286	BKID0005042	2026-07-21 02:35:28.677048	2026-07-21 02:35:28.677048	0.00	f	10.00	0.00	0.00	0.00	\N
92	42	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000286	BKID0005042	2026-07-21 02:37:06.087168	2026-07-21 02:37:06.087168	0.00	f	10.00	0.00	0.00	0.00	\N
93	43	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 02:51:44.743164	2026-07-21 02:51:44.743164	0.00	f	10.00	0.00	0.00	0.00	\N
94	44	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 03:15:52.93204	2026-07-21 03:15:52.93204	0.00	f	10.00	0.00	0.00	0.00	\N
95	45	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 03:29:19.64796	2026-07-21 03:29:19.64796	0.00	f	10.00	0.00	0.00	0.00	\N
96	46	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	4134782783	SBIN0018546	2026-07-21 03:40:06.194107	2026-07-21 03:40:06.194107	0.00	f	10.00	0.00	0.00	0.00	\N
97	47	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 03:53:54.614574	2026-07-21 03:53:54.614574	0.00	f	10.00	0.00	0.00	0.00	\N
98	48	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 05:03:31.315294	2026-07-21 05:03:31.315294	0.00	f	10.00	0.00	0.00	0.00	\N
99	49	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 05:40:54.792989	2026-07-21 05:40:54.792989	0.00	f	10.00	0.00	0.00	0.00	\N
100	50	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 05:53:40.921426	2026-07-21 05:53:40.921426	0.00	f	10.00	0.00	0.00	0.00	\N
101	51	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 06:13:52.204259	2026-07-21 06:13:52.204259	0.00	f	10.00	0.00	0.00	0.00	\N
102	52	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 06:36:26.324853	2026-07-21 06:36:26.324853	0.00	f	10.00	0.00	0.00	0.00	\N
103	53	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-21 10:05:42.079949	2026-07-21 10:05:42.079949	0.00	f	10.00	0.00	0.00	0.00	\N
104	54	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000237	BKID0005042	2026-07-21 10:17:04.974865	2026-07-21 10:17:04.974865	0.00	f	10.00	0.00	0.00	0.00	\N
105	55	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000046	BKID0005042	2026-07-21 10:42:29.969813	2026-07-21 10:42:29.969813	0.00	f	10.00	0.00	0.00	0.00	\N
106	56	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Manipur Rural Bank 	9024010030454	PUNBORRBHRB	2026-07-21 10:53:55.290714	2026-07-21 10:53:55.290714	0.00	f	10.00	0.00	0.00	0.00	\N
107	57	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-07-22 10:37:49.364908	2026-07-22 10:37:49.364908	0.00	f	10.00	0.00	0.00	0.00	\N
108	58	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-01 10:55:07.676557	2026-08-01 10:55:07.676557	0.00	f	10.00	0.00	0.00	0.00	\N
109	59	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-01 11:34:08.497819	2026-08-01 11:34:08.497819	0.00	f	10.00	0.00	0.00	0.00	\N
110	60	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-02 10:24:23.222737	2026-08-02 10:24:23.222737	0.00	f	10.00	0.00	0.00	0.00	\N
111	61	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-02 10:56:12.234429	2026-08-02 10:56:12.234429	0.00	f	10.00	0.00	0.00	0.00	\N
112	62	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Axis Bank	921010011712829	UTIB0002093	2026-08-02 11:24:53.804123	2026-08-02 11:24:53.804123	0.00	f	10.00	0.00	0.00	0.00	\N
113	63	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-03 08:11:08.879983	2026-08-03 08:11:08.879983	0.00	f	10.00	0.00	0.00	0.00	\N
114	10	3	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000341	BKID0005042	2026-08-05 11:29:26.217202	2026-08-05 11:29:26.217202	0.00	f	10.00	0.00	0.00	0.00	\N
115	64	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	HDFC Bank	50100298355646	HDFC0004744	2026-08-07 05:12:49.046555	2026-08-07 05:12:49.046555	0.00	f	10.00	0.00	0.00	0.00	\N
116	65	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	20081576933	SBIN0011626	2026-08-07 06:45:18.016151	2026-08-07 06:45:18.016151	0.00	f	10.00	0.00	0.00	0.00	\N
117	66	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000054	BKID0005042	2026-08-07 08:06:41.062668	2026-08-07 08:06:41.062668	0.00	f	10.00	0.00	0.00	0.00	\N
118	67	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-07 09:29:34.27493	2026-08-07 09:29:34.27493	0.00	f	10.00	0.00	0.00	0.00	\N
119	68	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-07 09:52:21.407982	2026-08-07 09:52:21.407982	0.00	f	10.00	0.00	0.00	0.00	\N
120	69	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-07 10:21:51.033686	2026-08-07 10:21:51.033686	0.00	f	10.00	0.00	0.00	0.00	\N
121	70	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-07 10:35:03.513819	2026-08-07 10:35:03.513819	0.00	f	10.00	0.00	0.00	0.00	\N
122	71	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-07 11:23:15.309901	2026-08-07 11:23:15.309901	0.00	f	10.00	0.00	0.00	0.00	\N
123	72	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	40918042703	SBIN0017403	2026-08-07 11:46:20.339557	2026-08-07 11:46:20.339557	0.00	f	10.00	0.00	0.00	0.00	\N
124	73	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-07 11:56:52.884333	2026-08-07 11:56:52.884333	0.00	f	10.00	0.00	0.00	0.00	\N
125	74	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Manipur Rural Bank 	901701042427	PUNBORRBMRB	2026-08-08 06:56:13.230562	2026-08-08 06:56:13.230562	0.00	f	10.00	0.00	0.00	0.00	\N
126	75	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-08 08:17:24.34917	2026-08-08 08:17:24.34917	0.00	f	10.00	0.00	0.00	0.00	\N
127	76	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-08 08:40:56.229253	2026-08-08 08:40:56.229253	0.00	f	10.00	0.00	0.00	0.00	\N
128	77	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-08 09:00:56.070872	2026-08-08 09:00:56.070872	0.00	f	10.00	0.00	0.00	0.00	\N
129	78	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	20388197697	SBIN0017403	2026-08-08 09:39:41.33266	2026-08-08 09:39:41.33266	0.00	f	10.00	0.00	0.00	0.00	\N
130	79	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-08 10:10:25.241283	2026-08-08 10:10:25.241283	0.00	f	10.00	0.00	0.00	0.00	\N
131	80	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-08 10:31:35.316229	2026-08-08 10:31:35.316229	0.00	f	10.00	0.00	0.00	0.00	\N
132	81	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000051	BKID0005042	2026-08-09 04:48:44.94989	2026-08-09 04:48:44.94989	0.00	f	10.00	0.00	0.00	0.00	\N
133	82	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000061	BKID0005042	2026-08-09 05:03:40.171999	2026-08-09 05:03:40.171999	0.00	f	10.00	0.00	0.00	0.00	\N
134	83	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-09 05:28:16.76419	2026-08-09 05:28:16.76419	0.00	f	10.00	0.00	0.00	0.00	\N
135	84	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-09 05:55:07.2852	2026-08-09 05:55:07.2852	0.00	f	10.00	0.00	0.00	0.00	\N
136	85	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-09 06:13:44.118284	2026-08-09 06:13:44.118284	0.00	f	10.00	0.00	0.00	0.00	\N
137	86	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-09 06:30:31.594972	2026-08-09 06:30:31.594972	0.00	f	10.00	0.00	0.00	0.00	\N
138	87	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-09 11:35:36.47223	2026-08-09 11:35:36.47223	0.00	f	10.00	0.00	0.00	0.00	\N
139	88	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-09 11:55:21.621258	2026-08-09 11:55:21.621258	0.00	f	10.00	0.00	0.00	0.00	\N
140	89	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-10 05:46:28.564147	2026-08-10 05:46:28.564147	0.00	f	10.00	0.00	0.00	0.00	\N
141	90	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-10 05:56:29.507095	2026-08-10 05:56:29.507095	0.00	f	10.00	0.00	0.00	0.00	\N
142	91	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-12 11:14:34.175727	2026-08-12 11:14:34.175727	0.00	f	10.00	0.00	0.00	0.00	\N
143	92	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-13 06:08:27.33305	2026-08-13 06:08:27.33305	0.00	f	10.00	0.00	0.00	0.00	\N
144	93	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	44487641238	SBIN0011626	2026-08-13 11:21:21.150832	2026-08-13 11:21:21.150832	0.00	f	10.00	0.00	0.00	0.00	\N
145	94	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	36705785866	SBIN0017201	2026-08-13 11:33:36.172778	2026-08-13 11:33:36.172778	0.00	f	10.00	0.00	0.00	0.00	\N
146	95	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000285	BKID0005042	2026-08-16 07:00:17.994393	2026-08-16 07:00:17.994393	0.00	f	10.00	0.00	0.00	0.00	\N
147	96	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-16 07:18:09.838211	2026-08-16 07:18:09.838211	0.00	f	10.00	0.00	0.00	0.00	\N
148	97	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	34498430422	SBIN0004562	2026-08-16 10:51:46.950394	2026-08-16 10:51:46.950394	0.00	f	10.00	0.00	0.00	0.00	\N
149	98	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-16 11:09:44.093331	2026-08-16 11:09:44.093331	0.00	f	10.00	0.00	0.00	0.00	\N
150	99	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-16 11:17:40.015367	2026-08-16 11:17:40.015367	0.00	f	10.00	0.00	0.00	0.00	\N
151	100	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	44885377392	SBIN0061675	2026-08-16 11:27:52.54672	2026-08-16 11:27:52.54672	0.00	f	10.00	0.00	0.00	0.00	\N
152	101	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-16 11:38:01.040403	2026-08-16 11:38:01.040403	0.00	f	10.00	0.00	0.00	0.00	\N
153	102	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	43479561495	SBIN0011626	2026-08-17 05:15:28.313116	2026-08-17 05:15:28.313116	0.00	f	10.00	0.00	0.00	0.00	\N
154	103	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	43447155550	SBIN0000092	2026-08-17 08:46:19.886186	2026-08-17 08:46:19.886186	0.00	f	10.00	0.00	0.00	0.00	\N
155	104	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000059	BKID0005042	2026-08-19 05:24:47.799785	2026-08-19 05:24:47.799785	0.00	f	10.00	0.00	0.00	0.00	\N
156	105	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-19 06:40:14.905483	2026-08-19 06:40:14.905483	0.00	f	10.00	0.00	0.00	0.00	\N
157	106	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-19 06:53:06.857078	2026-08-19 06:53:06.857078	0.00	f	10.00	0.00	0.00	0.00	\N
158	107	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-19 07:08:49.343809	2026-08-19 07:08:49.343809	0.00	f	10.00	0.00	0.00	0.00	\N
159	108	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-19 07:59:58.712767	2026-08-19 07:59:58.712767	0.00	f	10.00	0.00	0.00	0.00	\N
160	109	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000067	BKID0005042	2026-08-19 09:45:50.585275	2026-08-19 09:45:50.585275	0.00	f	10.00	0.00	0.00	0.00	\N
161	110	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-19 09:57:32.87997	2026-08-19 09:57:32.87997	0.00	f	10.00	0.00	0.00	0.00	\N
162	111	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000241	BKID0005042	2026-08-19 10:10:03.967264	2026-08-19 10:10:03.967264	0.00	f	10.00	0.00	0.00	0.00	\N
163	112	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000084	BKID0005042	2026-08-19 10:42:56.707861	2026-08-19 10:42:56.707861	0.00	f	10.00	0.00	0.00	0.00	\N
164	113	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-19 10:59:09.571091	2026-08-19 10:59:09.571091	0.00	f	10.00	0.00	0.00	0.00	\N
165	108	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-20 05:21:00.47916	2026-08-20 05:21:00.47916	0.00	f	10.00	0.00	0.00	0.00	\N
166	111	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000241	BKID0005042	2026-08-20 05:21:25.119562	2026-08-20 05:21:25.119562	0.00	f	10.00	0.00	0.00	0.00	\N
167	110	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-20 05:21:41.053372	2026-08-20 05:21:41.053372	0.00	f	10.00	0.00	0.00	0.00	\N
168	109	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000067	BKID0005042	2026-08-20 05:22:08.149883	2026-08-20 05:22:08.149883	0.00	f	10.00	0.00	0.00	0.00	\N
169	114	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000010	BKID0005042	2026-08-20 05:39:51.823743	2026-08-20 05:39:51.823743	0.00	f	10.00	0.00	0.00	0.00	\N
170	113	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-20 05:43:32.35415	2026-08-20 05:43:32.35415	0.00	f	10.00	0.00	0.00	0.00	\N
171	112	2	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000084	BKID0005042	2026-08-20 05:44:34.82407	2026-08-20 05:44:34.82407	0.00	f	10.00	0.00	0.00	0.00	\N
172	113	3	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-20 05:54:25.03452	2026-08-20 05:54:25.03452	0.00	f	10.00	0.00	0.00	0.00	\N
173	115	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000265	BKID0005042	2026-08-20 06:01:37.433154	2026-08-20 06:01:37.433154	0.00	f	10.00	0.00	0.00	0.00	\N
174	116	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	40662295005	SBIN0011626	2026-08-20 06:42:21.050717	2026-08-20 06:42:21.050717	0.00	f	10.00	0.00	0.00	0.00	\N
175	117	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000011	BKID0005042	2026-08-20 08:34:14.672467	2026-08-20 08:34:14.672467	0.00	f	10.00	0.00	0.00	0.00	\N
176	118	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000095	BKID0005042	2026-08-20 09:05:26.376292	2026-08-20 09:05:26.376292	0.00	f	10.00	0.00	0.00	0.00	\N
177	119	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000266	BKID0005042	2026-08-20 09:24:39.317173	2026-08-20 09:24:39.317173	0.00	f	10.00	0.00	0.00	0.00	\N
178	120	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000240	BKID0005042	2026-08-20 09:42:33.002217	2026-08-20 09:42:33.002217	0.00	f	10.00	0.00	0.00	0.00	\N
179	121	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	State Bank of India	43482513821	SBIN0018390	2026-08-20 09:57:07.615556	2026-08-20 09:57:07.615556	0.00	f	10.00	0.00	0.00	0.00	\N
180	42	3	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000286	BKID0005042	2026-08-20 10:16:20.682141	2026-08-20 10:16:20.682141	0.00	f	10.00	0.00	0.00	0.00	\N
181	122	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Punjab National Bank 	0256201700015739	PUNB0025620	2026-08-21 05:19:28.249704	2026-08-21 05:19:28.249704	0.00	f	10.00	0.00	0.00	0.00	\N
182	123	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Punjab National Bank 	0256201700096390	PUNB0025620	2026-08-21 05:28:59.559691	2026-08-21 05:28:59.559691	0.00	f	10.00	0.00	0.00	0.00	\N
183	124	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-21 10:27:35.00482	2026-08-21 10:27:35.00482	0.00	f	10.00	0.00	0.00	0.00	\N
184	125	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-21 10:37:54.186269	2026-08-21 10:37:54.186269	0.00	f	10.00	0.00	0.00	0.00	\N
185	126	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-21 10:44:18.845258	2026-08-21 10:44:18.845258	0.00	f	10.00	0.00	0.00	0.00	\N
186	127	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-21 10:56:33.687229	2026-08-21 10:56:33.687229	0.00	f	10.00	0.00	0.00	0.00	\N
187	128	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00				2026-08-23 04:34:52.720212	2026-08-23 04:34:52.720212	0.00	f	10.00	0.00	0.00	0.00	\N
188	129	1	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00	Bank Of India	504216510000029	BKID0005042	2026-08-23 04:54:42.133244	2026-08-23 04:54:42.133244	0.00	f	10.00	0.00	0.00	0.00	\N
\.


--
-- Data for Name: staff_supervisors; Type: TABLE DATA; Schema: public; Owner: -
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
19	10	3	\N	\N	2026-08-05 11:29:26.248012	2026-08-05 11:29:26.248012
20	108	2	\N	\N	2026-08-20 05:21:00.607503	2026-08-20 05:21:00.607503
21	111	2	\N	\N	2026-08-20 05:21:25.241441	2026-08-20 05:21:25.241441
22	110	2	\N	\N	2026-08-20 05:21:41.160394	2026-08-20 05:21:41.160394
23	109	2	\N	\N	2026-08-20 05:22:08.249928	2026-08-20 05:22:08.249928
24	113	2	\N	\N	2026-08-20 05:43:32.992389	2026-08-20 05:43:32.992389
25	112	2	\N	\N	2026-08-20 05:44:35.098191	2026-08-20 05:44:35.098191
26	113	3	\N	\N	2026-08-20 05:54:25.080781	2026-08-20 05:54:25.080781
27	42	3	\N	\N	2026-08-20 10:16:20.731994	2026-08-20 10:16:20.731994
\.


--
-- Data for Name: staff_weekly_off_days; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_weekly_off_days (id, staff_id, days_of_week, effective_from, effective_to, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transactions (id, date, description, category, type, amount, payment_method, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: unit_conversions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.unit_conversions (id, from_unit_id, to_unit_id, multiplier, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: unit_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.unit_types (id, name, symbol, category, is_base_unit, description, created_at, updated_at) FROM stdin;
1	Piece	pcs	Count/Quantity	t	\N	2026-08-23 16:51:22.637866	2026-08-23 16:51:22.637866
2	Box	box	Packaging	f	\N	2026-08-23 16:51:22.637866	2026-08-23 16:51:22.637866
3	Strip	strip	Packaging	f	\N	2026-08-23 16:51:22.637866	2026-08-23 16:51:22.637866
4	Bottle	btl	Packaging	f	\N	2026-08-23 16:51:22.637866	2026-08-23 16:51:22.637866
5	Vial	vial	Packaging	f	\N	2026-08-23 16:51:22.637866	2026-08-23 16:51:22.637866
6	Ampoule	amp	Packaging	f	\N	2026-08-23 16:51:22.637866	2026-08-23 16:51:22.637866
7	Kilogram	kg	Weight/Mass	f	\N	2026-08-23 16:51:22.637866	2026-08-23 16:51:22.637866
8	Gram	g	Weight/Mass	t	\N	2026-08-23 16:51:22.637866	2026-08-23 16:51:22.637866
9	Liter	L	Volume/Liquid	f	\N	2026-08-23 16:51:22.637866	2026-08-23 16:51:22.637866
10	Milliliter	ml	Volume/Liquid	t	\N	2026-08-23 16:51:22.637866	2026-08-23 16:51:22.637866
11	Nos	nos	Count/Quantity	t	\N	2026-08-23 16:51:22.637866	2026-08-23 16:51:22.637866
12	Pack	pkt	Packaging	f	\N	2026-08-23 16:51:22.637866	2026-08-23 16:51:22.637866
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."user" (id, name, email, "emailVerified", image, role, banned, "banReason", "banExpires", "createdAt", "updatedAt", "mustChangePassword") FROM stdin;
CWxJYVVn3yukA1MdZP2USnY79c6eHElK	Ningthoujam Ronita Devi	ningthoujamronita3786@gmail.com	f	\N	hr	f	\N	\N	2026-07-14 11:10:25.11	2026-07-14 11:10:25.11	f
Bgjpqf82gbQdlTu5rDK0SwKOqcmGUC5W	Khundrakpam Memtombi Devi	echanthoibi69992@gmail.com	f	\N	staff	f	\N	\N	2026-07-14 11:46:50.145	2026-07-14 11:46:50.145	f
3NswyKWy8XHdjRFYNlDiIRTiF6PBhuJ1	Maibam Romita Devi	mromita1993@gmail.com	f	\N	staff	f	\N	\N	2026-07-14 11:46:57.189	2026-07-14 11:46:57.189	f
nvXxmD6gQiWQCpifJMU3LnJc6Nf7SYQB	Keithellakpam Sonilata Devi	keithellakpamsanny@gmail.com	f	\N	staff	f	\N	\N	2026-07-14 11:47:05.171	2026-07-14 11:47:05.171	f
tbveHFSWmjR1ucyxMBRQek32JjvjG63Z	Ngangkham Tarunkumar Singh	tarunng12@gmail.com	f	\N	staff	f	\N	\N	2026-07-14 11:47:13.286	2026-07-14 11:47:13.286	f
1Dv121z8xdadYrlt8gVSvuFytyzP7KGH	Priyanka Laishram	priyankalaishram2002@gmail.com	f	\N	staff	f	\N	\N	2026-07-16 11:58:15.511	2026-07-16 11:58:15.511	f
iWtssW4KRlqMcyyeClwWrKLMn7wNhfJn	Angom Priyakumari	angompriyakumari464@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 05:55:11.802	2026-08-17 06:54:12.435	f
hLeMrXA5ZMH5AgfQZc8GYZm4pyrZ8dks	Pinky Laishram	pinkylaishram333@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 05:53:40.587	2026-08-01 05:53:40.857	t
DJffRC13mVfUWM0qLctUM3VmKTAclO1G	Kangjam Sangeeta Devi 	sangeetapibaren@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 05:53:51.689	2026-08-01 05:53:51.959	t
LmXP90ESDDr4ILDycFrWMPwdkm4V6IvL	Laiphrakpam Karuna	karyaslaiphrakpam@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 05:54:01.987	2026-08-01 05:54:02.246	t
y9AwVdaV8REzaQZX08us34bF2DcMAjuR	Guruaribam Rohit Kumar Sharma	g.rohitkrs@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 05:54:11.538	2026-08-01 05:54:11.805	t
ZaXEKiTyC2AbpYNppMK8WC8palmUoOCz	Sougrakpam Sushillo Singh	sushillosougrakpam97@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 05:54:19.509	2026-08-01 05:54:19.805	t
WryP1Jst7akboXbIH8kidnUYiEn28Dkc	Takhenchangbam Jhansirani	janemariachinglun@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 05:54:27.165	2026-08-01 05:54:27.443	t
ThEHTj5EsetIHnX4yVCHWpccydwjRFQB	Maibam Sanatombi Chanu	maibamsanatombi7@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 05:54:47.833	2026-08-01 05:54:48.09	t
Znok1nrEYDS5L3ccWY3SjvmWbxvBkHpG	Narmada Khomdram	narmadakhomdram@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:08.568	2026-08-18 06:09:38.539	f
p2e4BUq5AzMQ9f8E5flIsq3KyGG8g40e	Aheibam Lamnganbi Chanu	aheibamchanu@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:00.34	2026-08-17 06:56:20.008	f
sAgfSVGUmIXsEyM9I4qy804Gom4b0o9B	Keisham Cheengwang	kcwang.keisham@gamil.com	f	\N	staff	f	\N	\N	2026-08-01 05:55:53.337	2026-08-01 05:55:53.627	t
52W7tNe2uXJuUYjDIFk9T6zXVERhdBdc	Subhashchandra K	subhashck@gmail.com	t	\N	admin	f	\N	\N	2026-07-14 09:14:46.465	2026-08-01 05:58:54.49	f
56i2G5jlvvQ2xnyB2At4NLBaZGE8GRzM	Ningthoujam Dhanapyari	dhana.006@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 05:48:49.537	2026-08-01 06:02:05.811	f
fSeIkMaNgrSXK7xgHoOJ1NOOoBDaadBO	Beishamayum Niliza Devi	nilizaatom@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 05:55:00.862	2026-08-17 07:10:39.859	f
S5Dkn2ap2N3ETY8Qnx0q95hFWe0rWXBp	Pukhrambam Anju Devi	anjupukhrambamnew@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:04.025	2026-08-01 06:16:04.314	t
bvVcAKHJBjjzrlj1eNFpBfkeVdJCmFbJ	Derick Yambem 	derickyambem123@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:07.179	2026-08-01 06:16:07.481	t
6UsDRP2gK1LCSYm15BlTRPU9YESdKMKo	Oinam Sapana Devi	sapanaoinamthoi@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:10.367	2026-08-01 06:16:10.736	t
bM83dg1rAM0UVAvfTneUPRZX7snAv4vo	Thanglendanla Dina Chiru	dina12thanglen@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:14.036	2026-08-01 06:16:14.269	t
ZdelJUtCi4MIyrqsOYzlzu6qHP662fXO	Priyaluxmi Tongbram	priyaluxmitongbram35532@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:17.724	2026-08-01 06:16:17.982	t
4RlM0XEcby4dd3l5LcsTzWvqqXWLGiX8	Moirangthem Puinapati Devi	moirangthempuinapati@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:20.662	2026-08-01 06:16:20.892	t
TmMMuSm4RxwiYdi1eTGD8yBSiX4zHIdQ	Chongtham Melisha	chanbiichongthamchanbi65@gamil.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:24.213	2026-08-01 06:16:24.444	t
MzssomKGCJvFH4Cvn3JggrGXNDnDAj2H	Rajkumari Premika Chanu	rajkumaripremika2000@gamil.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:27.365	2026-08-01 06:16:27.641	t
6lJNa4T9alzrd02uUbhQCtSIKt3ys1I7	Mayengbam Jayenti Devi	mayengbamjayenti@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:30.802	2026-08-01 06:16:31.027	t
JeKpjkKNOQD0M8LM2IAjuOPrXXgZiDha	Yengkhom Amarjit Meitei	amarjityengkhom098@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:33.84	2026-08-01 06:16:34.179	t
bsMHslOvNMdJcJmzosFHaZPNAUoXM4if	Chandam Radharani Devi	chandamradharani@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:37.458	2026-08-01 06:16:37.762	t
sG7rpE0Z8Wq8gXkvYZPhMc1Xw2PEeclu	Thiyam Priya	thiyampriya99@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:40.818	2026-08-01 06:16:41.056	t
xdghzjTgvlyzH98CKFlSqDqVtKxNsaV4	Khangembam Khamlangba Singh	khamlangba.kh@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:43.719	2026-08-01 06:16:44.026	t
IdCdOWQrCJoPBnmSTG82glvQY6W1C7LL	Shamanduram Shunanda Devi	shunanda14@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:46.884	2026-08-01 06:16:47.111	t
g49vlAvrPurduArcWzgovY1HZDlNMTxl	Soram Amita Devi	amitasoram36@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:49.989	2026-08-01 06:16:50.213	t
Mvwfiy9txZXzOAAYrfwnaLt96lEsUGzc	Nanaobi Waikhom	nanaobiwaikhom29@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:52.953	2026-08-01 06:16:53.185	t
6qoYlfcYwY5n6D65ABwcvuMPsO5Yx6cb	Menerajkini Yengkhom	kiniyengkhom000@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:56.553	2026-08-01 06:16:56.783	t
qHthSYs5gYaR6vgGwvqnarnNPcq2cF6l	Aribam Riya Sharma	rjshria@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:16:59.316	2026-08-01 06:16:59.576	t
Iu5RRoqCbs1TzGTCY602U8xrbung5QTg	Jackie Laiphrakpam	laiphrakpam76@gamil.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:02.267	2026-08-01 06:17:02.512	t
Oj72twF3RCSaaonS5VDoaWMnutnsMo6H	Heikrujam Sandhyarani Devi	heikrujamsandhya123@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:05.293	2026-08-01 06:17:05.532	t
ywPKfKGO0ML8NdzjqsZorbJogPj1NXDK	Leitanthem Nanao Devi	leitanthemnanao07@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:11.509	2026-08-01 06:17:11.752	t
R6h7DbBNudQ0zxU0AMxkk8JkWVKH4lFv	Chungkham Nikita	chungkhamnikita73@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:14.49	2026-08-01 06:17:14.749	t
rRIkKhEGpxpzgjoKcqUg8RTyxhtZWZUu	Phuritshabam Premlata Devi	phuritsabam23@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:17.182	2026-08-01 06:17:17.459	t
Jp1aAIrNr5lmyBuWpBFyyprL3olHsgYR	Samjetsabam Babysana Devi	babysanasamjet@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:20.345	2026-08-01 06:17:20.66	t
7I5EPuFnqqNWFwdPCfcCS5koGv0LG0b4	Brahmacharimayum Arsia	arsiasharma123@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:24.205	2026-08-01 06:17:24.516	t
ZcetNLyDLsCFENzy8GGsifvgKo4wxlkw	Oinam Manju	oinammanju5@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:27.315	2026-08-01 06:17:27.624	t
wfcpIQGrsKRU1hrCkCxj29idqnSxNn9A	Thokchom Linthoinganbi	linthoithokchom805@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:30.075	2026-08-01 06:17:30.437	t
BRGSLp1aIioqWyKHoSsnmwx0GpHqacv5	Elangbam Tarunjit	elangbamelle@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:32.815	2026-08-01 06:17:33.171	t
4jkPcSiE1XLo8XjDPon3LlNzhvgC5cls	System Administrator	admin@acmehospital.health	t	\N	admin	t	\N	\N	2026-07-23 06:18:24.441	2026-08-01 06:18:21.337	f
hzNCUhfxtIOBi8fZuYV6dNpRvXgZJEpK	Thounaojam Sorojini Chanu	sorojini.83@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 05:53:33.913	2026-08-01 11:50:11.186	f
dEa53V8MYFoGbxP7GuKUptpU8Dayd0hm	Tourangbam Anita Devi	ruhiniarambam242@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:39.619	2026-08-01 06:17:39.872	t
vBWXujbcpc0s3bIoXSzYz9smtUiQB7Zz	Sonia Hanglem	soniahanglem@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:45.936	2026-08-01 06:17:46.171	t
WuL6qppGqTBJqO5De6CP1pmELvTrkewo	Bidyalaxmi Salam	bidyalaxmisalam@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:52.137	2026-08-01 06:17:52.39	t
slG7X1kSLzd6RbuLwhwlCFfAZS7q7wwm	Mayengbam Chandrikamalini	mayengbamchandrika8@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:36.41	2026-08-17 06:57:57.806	f
PsmB3B8gWSRGwQAjBW2jwPBmPcaXSLfd	Pukhrambam Niranjala Devi	teddypuk1234@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:42.379	2026-08-01 06:17:42.608	t
rq93SK8Zy0W7zJkpb0RACVkKbKqDQIch	Kabrambam Yukiko	kabrambamyukiko@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:49.28	2026-08-01 06:17:49.519	t
MPvF2gvOtlVFAuZi4sZk9CFYrMSuu5wE	Robertsun Elangbam	robertsunelangbam2012@gmail.com	f	\N	staff	f	\N	\N	2026-08-01 06:17:55.285	2026-08-01 06:17:55.596	t
VshdvkNW6AmNIXKMBEM1inPwWbk7BN4a	Nongthombam Priyanki Devi	priyankid65@gmail.com	f	\N	staff	f	\N	\N	2026-08-02 15:34:39.562	2026-08-02 15:34:40.884	t
P156rgOwPYsPRQ1z37cmWWPrLvnW9ynY	Galina Hijam	galinalaishram@gmail.com	f	\N	staff	f	\N	\N	2026-08-02 15:34:53.692	2026-08-02 15:34:54.155	t
UDgqsJfXLPFztSZvIQSYS05fcrEXp71D	Naorem Shilla Devi	shillanaorem1@gmail.com	f	\N	staff	f	\N	\N	2026-08-03 11:44:57.362	2026-08-03 11:44:57.847	t
UzN62yhXmDIolOr5lveTXMlx1HtjWbuT	Guihiamliu Moita	guihiammoita@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:01:39.792	2026-08-11 12:01:40.167	t
YLfOZqe3qKI4h1Tr1yBNA6HMNVdmBru5	Akoijam Maheshwor Singh	mahesakoijam.official@gmail.com	f	\N	staff	f	\N	\N	2026-08-05 11:29:52.062	2026-08-05 12:04:24.581	f
37M2hvuLnOERyCrLD6Roe95886g5Icg5	Irom Sangita Devi	sangitairom80@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:01:44.507	2026-08-11 12:01:45.148	t
6c5Lb48MdG0kgFKKZIpv4a6uJtetrU5m	Dr. James Elangbam	james.elangbam@gmail.com	f	\N	staff	f	\N	\N	2026-08-06 09:53:08.128	2026-08-06 09:53:08.405	t
GcZYGD8kusgbhHZGaNvTCCpZ8GISCgCc	Dr. Mrinalini Konjengbam	mrina_k@yahoo.co.in	f	\N	staff	f	\N	\N	2026-08-05 12:12:16.823	2026-08-06 09:53:26.413	t
W3IXn5OnScTi0oYEXkndY6je4xeECuCe	Yambem Romabati Devi	yambemromabati@gmail.com	f	\N	staff	f	\N	\N	2026-08-08 04:41:47.797	2026-08-08 04:41:48.099	t
CDrlnxvl0gz2iI92SVPG3r24lbmKuQDj	Huidrom Irish Chanu	huidromirishchanu@gmail.com	f	\N	staff	f	\N	\N	2026-08-08 04:41:51.702	2026-08-08 04:41:51.955	t
QAdA6wgcDYE7415AGv3588dCBkL8j0U2	Ningthoujam Reshmabati Chanu	ningthoujamreshmabati@gmail.com	f	\N	staff	f	\N	\N	2026-08-08 04:41:55.898	2026-08-08 04:41:56.162	t
RIn7m1TvxUFLcQX5qbB2qAXhsRJI2cgw	Ayinao Mungkung	ayinaomungkung@gmail.com	f	\N	staff	f	\N	\N	2026-08-08 04:41:59.862	2026-08-08 04:42:00.111	t
L3WMvTNS2mdndTCZEcVqZ9VkpVSajcdP	Yumkhaibam Thajamanbi Devi	yroshlin62@gmail.com	f	\N	staff	f	\N	\N	2026-08-08 04:42:03.244	2026-08-08 04:42:03.539	t
WPp13AvKWw6TriCwXeH1eUAFfLmp3vqR	Samsad	samsad563@gmail.com	f	\N	staff	f	\N	\N	2026-08-08 04:42:07.106	2026-08-08 04:42:07.378	t
bZgbdSln4Oz8EiX4SSgQP2AuCZiO7FOl	Pushparani Sapam	pushparanisapam493@gmail.com	f	\N	staff	f	\N	\N	2026-08-08 04:42:10.385	2026-08-08 04:42:10.638	t
NAZC507s8SFupcMpw97HDToNxZhkHGvN	Baseimayum Sajina	sajina123xyz@gmail.com	f	\N	staff	f	\N	\N	2026-08-08 04:42:13.374	2026-08-08 04:42:13.677	t
QETCIcKL3L2Dt4X2Hrd4hAH7U3DLYxtP	Thangjam Pushparani Devi	pushpar901@gmail.com	f	\N	staff	f	\N	\N	2026-08-08 04:42:17.037	2026-08-08 04:42:17.443	t
ls6wA2G0BeFv6mmbuaKGz6KwNEXr5PDt	MONGBIJAM SIMRAN DEVI	mongbijamsimarandevi@gmail.com	f	\N	staff	f	\N	\N	2026-08-08 04:42:20.722	2026-08-08 04:42:20.984	t
kKiWhq6S2aKO6UuY4XwPxqrjc8a8t1Lq	Nureda Shahni	shahninureda@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:01:26.392	2026-08-11 12:01:26.946	t
i5gQtoQNWyOtx0W397TNVDGi29dcICk3	Kshetrimayum Somi Devi	somidevi82569@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:01:31.186	2026-08-11 12:01:31.552	t
et5IzBSiRKXV9nb7NxCa4FgPJpIZHCV9	Hawaibam Sony Devi	hawaibamsony@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:01:35.129	2026-08-11 12:01:35.559	t
YnKzIEKfnfr8uEntgPnMtHHzYQ0z4LNJ	Irom Rupamani Devi	rupamaniirom2@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:01:48.302	2026-08-11 12:01:48.721	t
ipSluCETdB9k152UZqk6LC5azIl6phbG	Ningombam Sanatombi Devi	sanatombiningombam123@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:01:51.963	2026-08-11 12:01:52.435	t
vp1HiaN5MzhX9jIU4s5v5l6POJrtel4g	Ongnam Ithoi Singh	willewilleongnam@gmail.com	f	\N	staff	f	\N	\N	2026-08-17 12:34:42.915	2026-08-17 12:34:43.167	t
Q41cuVZ41NsKrjn0CcFrcVtFkOEHB065	Nongmaithem Bheigashree	bheigashreen@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:01:59.568	2026-08-11 12:01:59.943	t
oEnbRUnPCWvmKovJ1hq4JvvPnDtdmDhw	Sanjita Ningombam	sanjitaningombam793@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:02:02.727	2026-08-11 12:02:03.124	t
NYPpW8sWNDp4HrtcTacBhCKsRhAATjnu	Yumnam Bidyalaxmi Devi	yumnambidyalaxmi6@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:02:05.968	2026-08-11 12:02:06.443	t
zeeGZDbPGPHCscCCy3UrucGSHNAx4Q4a	Wangkhem Mary Devi	salammary07@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:02:09.673	2026-08-11 12:02:10.047	t
9XigSaxGVO8lu6KlzVrpUJewgJhOIUSq	Aribam Priya Devi	aribampiyabii1@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:02:13.23	2026-08-11 12:02:13.613	t
HOuAIuQmwUNgZhFkKGsaQKajS9dWERZz	Dr. Pukhrambam Nirmada	nirmadapukhrambam@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:02:17.286	2026-08-11 12:02:17.673	t
e5hFadZiKpbx76qYrAzJf41CAcOHj7E5	Ningthoujam Rahul Singh	bungning21@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:02:21.69	2026-08-11 12:02:22.037	t
ShP0rg6aeTFUUe6uCIOnemcLtaGRbzu1	Dilip Ingudam	diliprims@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:02:25.147	2026-08-11 12:02:25.512	t
xpzUGeQbZ5M5NBbsDUzjnTiuO6eOhocv	Debika Keisham	devikakeisham097@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:02:31.795	2026-08-11 12:02:32.223	t
lp0oqGEiuiZxMqEwJ7GBMnj7jT5z2ZfP	Longjam Shantipriya	longjamshantipriya12345@gmail.com	f	\N	staff	f	\N	\N	2026-08-14 05:25:55.664	2026-08-14 05:25:56.736	t
oyIxLPFQorKXgCKygLTxvglSdgfHASWk	Khwairakpam Samuel Meitei	samuelkhwairakpam873@gmail.com	f	\N	staff	f	\N	\N	2026-08-14 05:26:02.878	2026-08-14 05:26:03.143	t
zKdy6h44Fv2c8qJikShNeLTxUbYPfD9f	Irengbam Somokanta Singh	irengbambungsingh@gmail.com	f	\N	staff	f	\N	\N	2026-08-14 05:26:06.29	2026-08-14 05:26:06.544	t
fVm6VADGB7mUkbchII4DRsFBdGvQb3KV	Sanasam Bidyachandra Singh	sanasambidyachandra17@gmail.com	f	\N	staff	f	\N	\N	2026-08-14 05:26:10.696	2026-08-14 05:26:10.995	t
tvmUWmsmTu4QRfQn5ihKx7EwK3K5feLY	Moirangthem Bidyalaxmi Devi	moirangthemnely@gmail.com	f	\N	staff	f	\N	\N	2026-08-11 12:01:55.547	2026-08-17 06:56:20.336	f
kakfwAdbxtkKfV6a5amlHHc79bs7oWNC	Minakumari Athokpam	minaathokpam11@gmail.com	f	\N	staff	f	\N	\N	2026-08-02 15:34:46.193	2026-08-17 06:59:45.967	f
ffSm4sodxdiWv3WsjXA7Q4u91JKjtNCI	Ningombam Laksana Devi	thoibisanatakhel.bam@gmail.com	f	\N	staff	f	\N	\N	2026-08-17 12:34:47.9	2026-08-17 12:34:48.163	t
ODOJ6KT7epI8QN1l8sRKNPAI9fsZY3Jo	Beishamayum Paris Singh	lekthabimayum@gmail.com	f	\N	staff	f	\N	\N	2026-08-17 12:34:51.298	2026-08-17 12:34:51.547	t
K489SeItx8Jj8HqNLfuZcFXEjGkXhtrl	Nepram Ronald Singh	ronaldsingh630@gmail.com	f	\N	staff	f	\N	\N	2026-08-17 12:34:54.855	2026-08-17 12:34:55.082	t
BoY661ZwRMrKnngom15QANq7zSvWGY3P	Champion Ongnam	championongnam7@gmail.com	f	\N	staff	f	\N	\N	2026-08-17 12:34:58.432	2026-08-17 12:34:58.69	t
FiZDJCLMGlgXz2pfZE2TZsFwhamfNNxm	Abenao Thokchom	thokchomabenao44@gmail.com	f	\N	staff	f	\N	\N	2026-08-17 12:35:02.198	2026-08-17 12:35:02.453	t
BefrFmmjxOZmaivXvOIikvZhh9WIvlP5	Lucia Okram	luciaokram027@gmail.com	f	\N	staff	f	\N	\N	2026-08-17 12:35:06.125	2026-08-17 12:35:06.372	t
3nw95baXeASPfwxObXaAWn0ETpRfO6zL	Gaithaothoi Phaomei	gaithaothoiphaomei@gmail.com	f	\N	staff	f	\N	\N	2026-08-17 12:35:09.351	2026-08-17 12:35:10.026	t
zvI44L5rXCNfCzP87UUvPzoVxa9KOYzO	Sapam Arun Singh	arunsapam22@gmail.com	f	\N	staff	f	\N	\N	2026-08-17 12:35:15.823	2026-08-17 12:35:16.086	t
WatvV9UDwjXJnjkzFoXYuel2FfYEXFqJ	Shoibam Ibethoi Devi	ibethoirk@gmail.com	f	\N	staff	f	\N	\N	2026-08-20 05:42:00.936	2026-08-20 05:42:02.501	t
VL0aV4pVwbuqzNaDS9MTFnrmeKrOy9s7	Maibam Radha Devi	kshetrimayumradha164@gmail.com	f	\N	staff	f	\N	\N	2026-08-20 05:42:06.264	2026-08-20 05:42:06.521	t
Do6FQfPUZcIGck5nRkeD3Zg6hODoWzEW	Puyam Swarnalata Devi	kabitapuyam98@gmail.com	f	\N	staff	f	\N	\N	2026-08-20 05:42:09.519	2026-08-20 05:42:10.469	t
mjRYL3FSEEoCWgqmYCgJyRFCIQ9whtWY	Naorem Jitamala Devi	nandinilaishram1973@gmail.com	f	\N	staff	f	\N	\N	2026-08-20 05:42:13.669	2026-08-20 05:42:14.56	t
3iz36rvfzjk5sKmQlO7YQXhNUZwYGtg2	Nameirakpam Renubala Devi	sophiachanunamei@gmail.com	f	\N	staff	f	\N	\N	2026-08-20 05:42:17.442	2026-08-20 05:42:18.407	t
6dRHVMDzI88xZoqERxLDev45iefATYsb	Arubam Meekita Devi	mikiarb6464@gmail.com	f	\N	staff	f	\N	\N	2026-08-20 05:42:21.47	2026-08-20 05:42:22.468	t
o2C2BqYklhIDj6HTLNB9eH3YHjP0thlT	Phurailatpam Bankabihari Sharma	bankab223@gmail.com	f	\N	staff	f	\N	\N	2026-08-20 05:42:30.521	2026-08-20 05:42:30.772	t
h842HTjxS0abmxIx95jyjXuBFkyZVDmT	Khoisnam Naoba Meitei	sanayanbikh703@gmail.com	f	\N	staff	f	\N	\N	2026-08-20 05:42:35.287	2026-08-20 05:42:35.566	t
XatEjzz94rK2o6CbEDC7RHXwFMGgslQK	Loitongbam Ningthemjao Singh	loitongbamsoman@gmail.com	f	\N	staff	f	\N	\N	2026-08-20 05:42:38.543	2026-08-20 05:42:38.931	t
pDYdEP3ZNY4wrCkYd6BKWuWtEQ3Xc7Zo	Soubam Sangita Chanu	sangitachanu00@gmail.com	f	\N	staff	f	\N	\N	2026-08-20 05:42:41.634	2026-08-20 05:42:42.912	t
KKxyPIend0kTphrF3L4WVkkmx69wzueZ	Arubam Meekita Devi	mikiarb64@gmail.com	f	\N	staff	f	\N	\N	2026-08-20 05:55:20.721	2026-08-20 05:56:21.576	f
ZNoWXYNoSG64Ofje4RtkzbJ76OCG5Ehn	Nongmaithem Pinky Devi	nongmaithem00@gmail.com	f	\N	staff	f	\N	\N	2026-08-20 05:42:27.311	2026-08-21 10:27:24.088	f
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vendors (id, name, gst_number, contact_person, phone, address, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: verification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: document_sequences_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.document_sequences_id_seq', 9, true);


--
-- Name: item_batches_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.item_batches_id_seq', 2, true);


--
-- Name: purchase_invoice_items_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.purchase_invoice_items_id_seq', 1, false);


--
-- Name: purchase_invoice_payments_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.purchase_invoice_payments_id_seq', 1, false);


--
-- Name: purchase_invoices_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.purchase_invoices_id_seq', 1, false);


--
-- Name: sales_invoice_items_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.sales_invoice_items_id_seq', 4, true);


--
-- Name: sales_invoices_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.sales_invoices_id_seq', 3, true);


--
-- Name: sales_return_items_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.sales_return_items_id_seq', 1, false);


--
-- Name: sales_returns_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.sales_returns_id_seq', 1, false);


--
-- Name: stock_adjustment_items_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.stock_adjustment_items_id_seq', 1, true);


--
-- Name: stock_adjustments_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.stock_adjustments_id_seq', 1, true);


--
-- Name: stock_ledger_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.stock_ledger_id_seq', 9, true);


--
-- Name: stock_requisition_items_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.stock_requisition_items_id_seq', 1, true);


--
-- Name: stock_requisitions_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.stock_requisitions_id_seq', 1, true);


--
-- Name: stock_transfer_items_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.stock_transfer_items_id_seq', 1, true);


--
-- Name: stock_transfers_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.stock_transfers_id_seq', 1, true);


--
-- Name: store_batch_stock_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.store_batch_stock_id_seq', 3, true);


--
-- Name: store_staff_assignments_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.store_staff_assignments_id_seq', 1, false);


--
-- Name: stores_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: -
--

SELECT pg_catalog.setval('inventory.stores_id_seq', 3, true);


--
-- Name: appointments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.appointments_id_seq', 1, false);


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attendance_id_seq', 4, true);


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bank_accounts_id_seq', 1, false);


--
-- Name: banks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.banks_id_seq', 8, true);


--
-- Name: biometric_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.biometric_mappings_id_seq', 1, false);


--
-- Name: consultant_rates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.consultant_rates_id_seq', 1, false);


--
-- Name: daily_additional_income_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.daily_additional_income_id_seq', 1, false);


--
-- Name: daily_closing_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.daily_closing_reports_id_seq', 40, true);


--
-- Name: daily_discounts_returns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.daily_discounts_returns_id_seq', 4253, true);


--
-- Name: daily_expenditures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.daily_expenditures_id_seq', 23286, true);


--
-- Name: daily_ipd_admissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.daily_ipd_admissions_id_seq', 1, false);


--
-- Name: daily_ipd_discharges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.daily_ipd_discharges_id_seq', 1, false);


--
-- Name: daily_payment_channels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.daily_payment_channels_id_seq', 24486, true);


--
-- Name: daily_pharmacy_income_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.daily_pharmacy_income_id_seq', 1, false);


--
-- Name: daily_service_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.daily_service_lines_id_seq', 47560, true);


--
-- Name: daily_staff_advances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.daily_staff_advances_id_seq', 79, true);


--
-- Name: department_leaders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.department_leaders_id_seq', 46, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.departments_id_seq', 24, true);


--
-- Name: designations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.designations_id_seq', 45, true);


--
-- Name: encounters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.encounters_id_seq', 1, false);


--
-- Name: expense_catalog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expense_catalog_id_seq', 47, true);


--
-- Name: expense_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expense_categories_id_seq', 49, true);


--
-- Name: grn_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.grn_items_id_seq', 1, false);


--
-- Name: grns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.grns_id_seq', 1, false);


--
-- Name: immunization_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.immunization_records_id_seq', 1, false);


--
-- Name: immunization_schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.immunization_schedules_id_seq', 1, false);


--
-- Name: inventory_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_items_id_seq', 1, false);


--
-- Name: item_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.item_types_id_seq', 1, true);


--
-- Name: item_unit_prices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.item_unit_prices_id_seq', 1, false);


--
-- Name: items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.items_id_seq', 1, true);


--
-- Name: leave_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leave_requests_id_seq', 7, true);


--
-- Name: leave_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leave_types_id_seq', 5, true);


--
-- Name: management_approvers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.management_approvers_id_seq', 2, true);


--
-- Name: medicines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.medicines_id_seq', 1, false);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 5, true);


--
-- Name: monthly_bank_expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.monthly_bank_expenses_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 36, true);


--
-- Name: nursing_academic_schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_academic_schedules_id_seq', 1, true);


--
-- Name: nursing_applicants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_applicants_id_seq', 16, true);


--
-- Name: nursing_attendance_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_attendance_records_id_seq', 1, false);


--
-- Name: nursing_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_audit_logs_id_seq', 28, true);


--
-- Name: nursing_batches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_batches_id_seq', 3, true);


--
-- Name: nursing_courses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_courses_id_seq', 1, true);


--
-- Name: nursing_fee_structures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_fee_structures_id_seq', 1, true);


--
-- Name: nursing_fee_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_fee_transactions_id_seq', 2, true);


--
-- Name: nursing_referrer_payment_allocations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_referrer_payment_allocations_id_seq', 1, false);


--
-- Name: nursing_referrer_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_referrer_payments_id_seq', 1, false);


--
-- Name: nursing_referrers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_referrers_id_seq', 1, false);


--
-- Name: nursing_student_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_student_documents_id_seq', 1, false);


--
-- Name: nursing_student_fee_frequencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_student_fee_frequencies_id_seq', 1, false);


--
-- Name: nursing_students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_students_id_seq', 2, true);


--
-- Name: nursing_subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_subjects_id_seq', 25, true);


--
-- Name: nursing_supers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nursing_supers_id_seq', 2, true);


--
-- Name: patients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.patients_id_seq', 1, false);


--
-- Name: payslips_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payslips_id_seq', 1, false);


--
-- Name: po_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.po_items_id_seq', 1, false);


--
-- Name: po_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.po_payments_id_seq', 1, false);


--
-- Name: prescription_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.prescription_lines_id_seq', 1, false);


--
-- Name: prescriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.prescriptions_id_seq', 1, false);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.purchase_orders_id_seq', 1, false);


--
-- Name: report_category_exclusions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.report_category_exclusions_id_seq', 1, false);


--
-- Name: rosters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rosters_id_seq', 54, true);


--
-- Name: security_deposit_refunds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.security_deposit_refunds_id_seq', 1, false);


--
-- Name: service_catalog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.service_catalog_id_seq', 118, true);


--
-- Name: service_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.service_categories_id_seq', 16, true);


--
-- Name: shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.shifts_id_seq', 9, true);


--
-- Name: staff_departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_departments_id_seq', 188, true);


--
-- Name: staff_hr_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_hr_profiles_id_seq', 188, true);


--
-- Name: staff_off_day_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_off_day_requests_id_seq', 1, false);


--
-- Name: staff_salaries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_salaries_id_seq', 188, true);


--
-- Name: staff_supervisors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_supervisors_id_seq', 27, true);


--
-- Name: staff_weekly_off_days_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_weekly_off_days_id_seq', 1, false);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.transactions_id_seq', 1, false);


--
-- Name: unit_conversions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.unit_conversions_id_seq', 1, false);


--
-- Name: unit_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.unit_types_id_seq', 13, true);


--
-- Name: vendors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vendors_id_seq', 1, false);


--
-- Name: document_sequences document_sequences_code_financial_year_unique; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.document_sequences
    ADD CONSTRAINT document_sequences_code_financial_year_unique UNIQUE (code, financial_year);


--
-- Name: document_sequences document_sequences_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.document_sequences
    ADD CONSTRAINT document_sequences_pkey PRIMARY KEY (id);


--
-- Name: item_batches item_batches_item_id_batch_number_unique; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.item_batches
    ADD CONSTRAINT item_batches_item_id_batch_number_unique UNIQUE (item_id, batch_number);


--
-- Name: item_batches item_batches_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.item_batches
    ADD CONSTRAINT item_batches_pkey PRIMARY KEY (id);


--
-- Name: purchase_invoice_items purchase_invoice_items_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoice_items
    ADD CONSTRAINT purchase_invoice_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_invoice_payments purchase_invoice_payments_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoice_payments
    ADD CONSTRAINT purchase_invoice_payments_pkey PRIMARY KEY (id);


--
-- Name: purchase_invoices purchase_invoices_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoices
    ADD CONSTRAINT purchase_invoices_pkey PRIMARY KEY (id);


--
-- Name: sales_invoice_items sales_invoice_items_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_pkey PRIMARY KEY (id);


--
-- Name: sales_invoices sales_invoices_invoice_no_unique; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_invoices
    ADD CONSTRAINT sales_invoices_invoice_no_unique UNIQUE (invoice_no);


--
-- Name: sales_invoices sales_invoices_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_invoices
    ADD CONSTRAINT sales_invoices_pkey PRIMARY KEY (id);


--
-- Name: sales_return_items sales_return_items_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_return_items
    ADD CONSTRAINT sales_return_items_pkey PRIMARY KEY (id);


--
-- Name: sales_returns sales_returns_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_returns
    ADD CONSTRAINT sales_returns_pkey PRIMARY KEY (id);


--
-- Name: sales_returns sales_returns_return_no_unique; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_returns
    ADD CONSTRAINT sales_returns_return_no_unique UNIQUE (return_no);


--
-- Name: stock_adjustment_items stock_adjustment_items_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_pkey PRIMARY KEY (id);


--
-- Name: stock_adjustments stock_adjustments_adjustment_no_unique; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_adjustments
    ADD CONSTRAINT stock_adjustments_adjustment_no_unique UNIQUE (adjustment_no);


--
-- Name: stock_adjustments stock_adjustments_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_adjustments
    ADD CONSTRAINT stock_adjustments_pkey PRIMARY KEY (id);


--
-- Name: stock_ledger stock_ledger_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_ledger
    ADD CONSTRAINT stock_ledger_pkey PRIMARY KEY (id);


--
-- Name: stock_requisition_items stock_requisition_items_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_requisition_items
    ADD CONSTRAINT stock_requisition_items_pkey PRIMARY KEY (id);


--
-- Name: stock_requisitions stock_requisitions_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_requisitions
    ADD CONSTRAINT stock_requisitions_pkey PRIMARY KEY (id);


--
-- Name: stock_requisitions stock_requisitions_requisition_no_unique; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_requisitions
    ADD CONSTRAINT stock_requisitions_requisition_no_unique UNIQUE (requisition_no);


--
-- Name: stock_transfer_items stock_transfer_items_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_pkey PRIMARY KEY (id);


--
-- Name: stock_transfers stock_transfers_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_transfers
    ADD CONSTRAINT stock_transfers_pkey PRIMARY KEY (id);


--
-- Name: stock_transfers stock_transfers_transfer_no_unique; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_transfers
    ADD CONSTRAINT stock_transfers_transfer_no_unique UNIQUE (transfer_no);


--
-- Name: store_batch_stock store_batch_stock_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.store_batch_stock
    ADD CONSTRAINT store_batch_stock_pkey PRIMARY KEY (id);


--
-- Name: store_batch_stock store_batch_stock_store_id_batch_id_unique; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.store_batch_stock
    ADD CONSTRAINT store_batch_stock_store_id_batch_id_unique UNIQUE (store_id, batch_id);


--
-- Name: store_staff_assignments store_staff_assignments_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.store_staff_assignments
    ADD CONSTRAINT store_staff_assignments_pkey PRIMARY KEY (id);


--
-- Name: stores stores_code_unique; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stores
    ADD CONSTRAINT stores_code_unique UNIQUE (code);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: banks banks_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT banks_name_unique UNIQUE (name);


--
-- Name: banks banks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT banks_pkey PRIMARY KEY (id);


--
-- Name: biometric_mappings biometric_mappings_biometric_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_mappings
    ADD CONSTRAINT biometric_mappings_biometric_code_unique UNIQUE (biometric_code);


--
-- Name: biometric_mappings biometric_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_mappings
    ADD CONSTRAINT biometric_mappings_pkey PRIMARY KEY (id);


--
-- Name: biometric_mappings biometric_mappings_staff_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biometric_mappings
    ADD CONSTRAINT biometric_mappings_staff_id_unique UNIQUE (staff_id);


--
-- Name: consultant_rates consultant_rates_doctor_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultant_rates
    ADD CONSTRAINT consultant_rates_doctor_id_unique UNIQUE (doctor_id);


--
-- Name: consultant_rates consultant_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultant_rates
    ADD CONSTRAINT consultant_rates_pkey PRIMARY KEY (id);


--
-- Name: daily_additional_income daily_additional_income_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_additional_income
    ADD CONSTRAINT daily_additional_income_pkey PRIMARY KEY (id);


--
-- Name: daily_closing_reports daily_closing_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_closing_reports
    ADD CONSTRAINT daily_closing_reports_pkey PRIMARY KEY (id);


--
-- Name: daily_closing_reports daily_closing_reports_report_date_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_closing_reports
    ADD CONSTRAINT daily_closing_reports_report_date_unique UNIQUE (report_date);


--
-- Name: daily_discounts_returns daily_discounts_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_discounts_returns
    ADD CONSTRAINT daily_discounts_returns_pkey PRIMARY KEY (id);


--
-- Name: daily_expenditures daily_expenditures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_expenditures
    ADD CONSTRAINT daily_expenditures_pkey PRIMARY KEY (id);


--
-- Name: daily_ipd_admissions daily_ipd_admissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_ipd_admissions
    ADD CONSTRAINT daily_ipd_admissions_pkey PRIMARY KEY (id);


--
-- Name: daily_ipd_discharges daily_ipd_discharges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_ipd_discharges
    ADD CONSTRAINT daily_ipd_discharges_pkey PRIMARY KEY (id);


--
-- Name: daily_payment_channels daily_payment_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_payment_channels
    ADD CONSTRAINT daily_payment_channels_pkey PRIMARY KEY (id);


--
-- Name: daily_pharmacy_income daily_pharmacy_income_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_pharmacy_income
    ADD CONSTRAINT daily_pharmacy_income_pkey PRIMARY KEY (id);


--
-- Name: daily_pharmacy_income daily_pharmacy_income_report_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_pharmacy_income
    ADD CONSTRAINT daily_pharmacy_income_report_id_unique UNIQUE (report_id);


--
-- Name: daily_service_lines daily_service_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_service_lines
    ADD CONSTRAINT daily_service_lines_pkey PRIMARY KEY (id);


--
-- Name: daily_staff_advances daily_staff_advances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_staff_advances
    ADD CONSTRAINT daily_staff_advances_pkey PRIMARY KEY (id);


--
-- Name: department_leaders department_leaders_department_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_leaders
    ADD CONSTRAINT department_leaders_department_id_unique UNIQUE (department_id);


--
-- Name: department_leaders department_leaders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_leaders
    ADD CONSTRAINT department_leaders_pkey PRIMARY KEY (id);


--
-- Name: departments departments_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_unique UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: designations designations_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_name_unique UNIQUE (name);


--
-- Name: designations designations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_pkey PRIMARY KEY (id);


--
-- Name: encounters encounters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_pkey PRIMARY KEY (id);


--
-- Name: expense_catalog expense_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_catalog
    ADD CONSTRAINT expense_catalog_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_code_unique UNIQUE (code);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: grn_items grn_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_pkey PRIMARY KEY (id);


--
-- Name: grns grns_grn_no_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grns
    ADD CONSTRAINT grns_grn_no_unique UNIQUE (grn_no);


--
-- Name: grns grns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grns
    ADD CONSTRAINT grns_pkey PRIMARY KEY (id);


--
-- Name: immunization_records immunization_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immunization_records
    ADD CONSTRAINT immunization_records_pkey PRIMARY KEY (id);


--
-- Name: immunization_schedules immunization_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immunization_schedules
    ADD CONSTRAINT immunization_schedules_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_sku_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_sku_unique UNIQUE (sku);


--
-- Name: item_types item_types_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_types
    ADD CONSTRAINT item_types_name_unique UNIQUE (name);


--
-- Name: item_types item_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_types
    ADD CONSTRAINT item_types_pkey PRIMARY KEY (id);


--
-- Name: item_unit_prices item_unit_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_unit_prices
    ADD CONSTRAINT item_unit_prices_pkey PRIMARY KEY (id);


--
-- Name: items items_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_name_unique UNIQUE (name);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_request_no_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_request_no_unique UNIQUE (request_no);


--
-- Name: leave_types leave_types_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_name_unique UNIQUE (name);


--
-- Name: leave_types leave_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_pkey PRIMARY KEY (id);


--
-- Name: management_approvers management_approvers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.management_approvers
    ADD CONSTRAINT management_approvers_pkey PRIMARY KEY (id);


--
-- Name: medicines medicines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicines
    ADD CONSTRAINT medicines_pkey PRIMARY KEY (id);


--
-- Name: medicines medicines_sku_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medicines
    ADD CONSTRAINT medicines_sku_unique UNIQUE (sku);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: monthly_bank_expenses monthly_bank_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_bank_expenses
    ADD CONSTRAINT monthly_bank_expenses_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: nursing_academic_schedules nursing_academic_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_academic_schedules
    ADD CONSTRAINT nursing_academic_schedules_pkey PRIMARY KEY (id);


--
-- Name: nursing_applicants nursing_applicants_application_no_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_applicants
    ADD CONSTRAINT nursing_applicants_application_no_unique UNIQUE (application_no);


--
-- Name: nursing_applicants nursing_applicants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_applicants
    ADD CONSTRAINT nursing_applicants_pkey PRIMARY KEY (id);


--
-- Name: nursing_attendance_records nursing_attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_attendance_records
    ADD CONSTRAINT nursing_attendance_records_pkey PRIMARY KEY (id);


--
-- Name: nursing_audit_logs nursing_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_audit_logs
    ADD CONSTRAINT nursing_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: nursing_batches nursing_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_batches
    ADD CONSTRAINT nursing_batches_pkey PRIMARY KEY (id);


--
-- Name: nursing_courses nursing_courses_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_courses
    ADD CONSTRAINT nursing_courses_code_unique UNIQUE (code);


--
-- Name: nursing_courses nursing_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_courses
    ADD CONSTRAINT nursing_courses_pkey PRIMARY KEY (id);


--
-- Name: nursing_fee_structures nursing_fee_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_fee_structures
    ADD CONSTRAINT nursing_fee_structures_pkey PRIMARY KEY (id);


--
-- Name: nursing_fee_transactions nursing_fee_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_fee_transactions
    ADD CONSTRAINT nursing_fee_transactions_pkey PRIMARY KEY (id);


--
-- Name: nursing_fee_transactions nursing_fee_transactions_receipt_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_fee_transactions
    ADD CONSTRAINT nursing_fee_transactions_receipt_number_unique UNIQUE (receipt_number);


--
-- Name: nursing_referrer_payment_allocations nursing_referrer_payment_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_referrer_payment_allocations
    ADD CONSTRAINT nursing_referrer_payment_allocations_pkey PRIMARY KEY (id);


--
-- Name: nursing_referrer_payments nursing_referrer_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_referrer_payments
    ADD CONSTRAINT nursing_referrer_payments_pkey PRIMARY KEY (id);


--
-- Name: nursing_referrer_payments nursing_referrer_payments_voucher_no_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_referrer_payments
    ADD CONSTRAINT nursing_referrer_payments_voucher_no_unique UNIQUE (voucher_no);


--
-- Name: nursing_referrers nursing_referrers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_referrers
    ADD CONSTRAINT nursing_referrers_pkey PRIMARY KEY (id);


--
-- Name: nursing_student_documents nursing_student_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_student_documents
    ADD CONSTRAINT nursing_student_documents_pkey PRIMARY KEY (id);


--
-- Name: nursing_student_fee_frequencies nursing_student_fee_frequencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_student_fee_frequencies
    ADD CONSTRAINT nursing_student_fee_frequencies_pkey PRIMARY KEY (id);


--
-- Name: nursing_students nursing_students_enrollment_no_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_students
    ADD CONSTRAINT nursing_students_enrollment_no_unique UNIQUE (enrollment_no);


--
-- Name: nursing_students nursing_students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_students
    ADD CONSTRAINT nursing_students_pkey PRIMARY KEY (id);


--
-- Name: nursing_subjects nursing_subjects_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_subjects
    ADD CONSTRAINT nursing_subjects_code_unique UNIQUE (code);


--
-- Name: nursing_subjects nursing_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_subjects
    ADD CONSTRAINT nursing_subjects_pkey PRIMARY KEY (id);


--
-- Name: nursing_supers nursing_supers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_supers
    ADD CONSTRAINT nursing_supers_pkey PRIMARY KEY (id);


--
-- Name: patients patients_mrn_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_mrn_unique UNIQUE (mrn);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: payslips payslips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT payslips_pkey PRIMARY KEY (id);


--
-- Name: po_items po_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_items
    ADD CONSTRAINT po_items_pkey PRIMARY KEY (id);


--
-- Name: po_payments po_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_payments
    ADD CONSTRAINT po_payments_pkey PRIMARY KEY (id);


--
-- Name: prescription_lines prescription_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_lines
    ADD CONSTRAINT prescription_lines_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_po_no_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_po_no_unique UNIQUE (po_no);


--
-- Name: report_category_exclusions report_category_exclusions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_category_exclusions
    ADD CONSTRAINT report_category_exclusions_pkey PRIMARY KEY (id);


--
-- Name: report_category_exclusions report_category_exclusions_user_id_report_type_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_category_exclusions
    ADD CONSTRAINT report_category_exclusions_user_id_report_type_unique UNIQUE (user_id, report_type);


--
-- Name: rosters rosters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rosters
    ADD CONSTRAINT rosters_pkey PRIMARY KEY (id);


--
-- Name: rosters rosters_staff_id_date_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rosters
    ADD CONSTRAINT rosters_staff_id_date_unique UNIQUE (staff_id, date);


--
-- Name: security_deposit_refunds security_deposit_refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_deposit_refunds
    ADD CONSTRAINT security_deposit_refunds_pkey PRIMARY KEY (id);


--
-- Name: service_catalog service_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_catalog
    ADD CONSTRAINT service_catalog_pkey PRIMARY KEY (id);


--
-- Name: service_categories service_categories_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_code_unique UNIQUE (code);


--
-- Name: service_categories service_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_unique UNIQUE (token);


--
-- Name: shifts shifts_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_name_unique UNIQUE (name);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: staff_departments staff_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_departments
    ADD CONSTRAINT staff_departments_pkey PRIMARY KEY (id);


--
-- Name: staff_hr_profiles staff_hr_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_hr_profiles
    ADD CONSTRAINT staff_hr_profiles_pkey PRIMARY KEY (id);


--
-- Name: staff_hr_profiles staff_hr_profiles_staff_id_version_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_hr_profiles
    ADD CONSTRAINT staff_hr_profiles_staff_id_version_unique UNIQUE (staff_id, staff_version);


--
-- Name: staff_off_day_requests staff_off_day_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_off_day_requests
    ADD CONSTRAINT staff_off_day_requests_pkey PRIMARY KEY (id);


--
-- Name: staff_salaries staff_salaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_salaries
    ADD CONSTRAINT staff_salaries_pkey PRIMARY KEY (id);


--
-- Name: staff_salaries staff_salaries_staff_id_version_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_salaries
    ADD CONSTRAINT staff_salaries_staff_id_version_unique UNIQUE (staff_id, staff_version);


--
-- Name: staff staff_staff_id_version_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_staff_id_version_pk PRIMARY KEY (staff_id, version);


--
-- Name: staff_supervisors staff_supervisors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_supervisors
    ADD CONSTRAINT staff_supervisors_pkey PRIMARY KEY (id);


--
-- Name: staff_supervisors staff_supervisors_staff_id_version_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_supervisors
    ADD CONSTRAINT staff_supervisors_staff_id_version_unique UNIQUE (staff_id, staff_version);


--
-- Name: staff_weekly_off_days staff_weekly_off_days_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_weekly_off_days
    ADD CONSTRAINT staff_weekly_off_days_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: unit_conversions unit_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_conversions
    ADD CONSTRAINT unit_conversions_pkey PRIMARY KEY (id);


--
-- Name: unit_types unit_types_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_types
    ADD CONSTRAINT unit_types_name_unique UNIQUE (name);


--
-- Name: unit_types unit_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_types
    ADD CONSTRAINT unit_types_pkey PRIMARY KEY (id);


--
-- Name: user user_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_unique UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_name_unique UNIQUE (name);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: nursing_fee_structures_course_year_quota_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nursing_fee_structures_course_year_quota_idx ON public.nursing_fee_structures USING btree (course_id, academic_year, quota_category);


--
-- Name: nursing_student_fee_frequencies_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX nursing_student_fee_frequencies_unique_idx ON public.nursing_student_fee_frequencies USING btree (student_id, academic_year, component_name);


--
-- Name: item_batches item_batches_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.item_batches
    ADD CONSTRAINT item_batches_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: item_batches item_batches_supplier_id_vendors_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.item_batches
    ADD CONSTRAINT item_batches_supplier_id_vendors_id_fk FOREIGN KEY (supplier_id) REFERENCES public.vendors(id);


--
-- Name: purchase_invoice_items purchase_invoice_items_grn_item_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoice_items
    ADD CONSTRAINT purchase_invoice_items_grn_item_id_fkey FOREIGN KEY (grn_item_id) REFERENCES public.grn_items(id);


--
-- Name: purchase_invoice_items purchase_invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoice_items
    ADD CONSTRAINT purchase_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES inventory.purchase_invoices(id) ON DELETE CASCADE;


--
-- Name: purchase_invoice_items purchase_invoice_items_item_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoice_items
    ADD CONSTRAINT purchase_invoice_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: purchase_invoice_items purchase_invoice_items_unit_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoice_items
    ADD CONSTRAINT purchase_invoice_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unit_types(id);


--
-- Name: purchase_invoice_payments purchase_invoice_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoice_payments
    ADD CONSTRAINT purchase_invoice_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: purchase_invoice_payments purchase_invoice_payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoice_payments
    ADD CONSTRAINT purchase_invoice_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES inventory.purchase_invoices(id) ON DELETE CASCADE;


--
-- Name: purchase_invoices purchase_invoices_approved_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoices
    ADD CONSTRAINT purchase_invoices_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public."user"(id);


--
-- Name: purchase_invoices purchase_invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoices
    ADD CONSTRAINT purchase_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: purchase_invoices purchase_invoices_grn_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoices
    ADD CONSTRAINT purchase_invoices_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES public.grns(id);


--
-- Name: purchase_invoices purchase_invoices_po_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoices
    ADD CONSTRAINT purchase_invoices_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: purchase_invoices purchase_invoices_vendor_id_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoices
    ADD CONSTRAINT purchase_invoices_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: purchase_invoices purchase_invoices_verified_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.purchase_invoices
    ADD CONSTRAINT purchase_invoices_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public."user"(id);


--
-- Name: sales_invoice_items sales_invoice_items_batch_id_item_batches_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_batch_id_item_batches_id_fk FOREIGN KEY (batch_id) REFERENCES inventory.item_batches(id);


--
-- Name: sales_invoice_items sales_invoice_items_invoice_id_sales_invoices_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_invoice_id_sales_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES inventory.sales_invoices(id) ON DELETE CASCADE;


--
-- Name: sales_invoice_items sales_invoice_items_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: sales_invoices sales_invoices_cashier_id_user_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_invoices
    ADD CONSTRAINT sales_invoices_cashier_id_user_id_fk FOREIGN KEY (cashier_id) REFERENCES public."user"(id);


--
-- Name: sales_invoices sales_invoices_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_invoices
    ADD CONSTRAINT sales_invoices_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: sales_invoices sales_invoices_prescription_id_prescriptions_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_invoices
    ADD CONSTRAINT sales_invoices_prescription_id_prescriptions_id_fk FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id);


--
-- Name: sales_invoices sales_invoices_store_id_stores_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_invoices
    ADD CONSTRAINT sales_invoices_store_id_stores_id_fk FOREIGN KEY (store_id) REFERENCES inventory.stores(id);


--
-- Name: sales_return_items sales_return_items_batch_id_item_batches_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_return_items
    ADD CONSTRAINT sales_return_items_batch_id_item_batches_id_fk FOREIGN KEY (batch_id) REFERENCES inventory.item_batches(id);


--
-- Name: sales_return_items sales_return_items_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_return_items
    ADD CONSTRAINT sales_return_items_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: sales_return_items sales_return_items_return_id_sales_returns_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_return_items
    ADD CONSTRAINT sales_return_items_return_id_sales_returns_id_fk FOREIGN KEY (return_id) REFERENCES inventory.sales_returns(id) ON DELETE CASCADE;


--
-- Name: sales_returns sales_returns_cashier_id_user_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_returns
    ADD CONSTRAINT sales_returns_cashier_id_user_id_fk FOREIGN KEY (cashier_id) REFERENCES public."user"(id);


--
-- Name: sales_returns sales_returns_original_invoice_id_sales_invoices_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_returns
    ADD CONSTRAINT sales_returns_original_invoice_id_sales_invoices_id_fk FOREIGN KEY (original_invoice_id) REFERENCES inventory.sales_invoices(id);


--
-- Name: sales_returns sales_returns_store_id_stores_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.sales_returns
    ADD CONSTRAINT sales_returns_store_id_stores_id_fk FOREIGN KEY (store_id) REFERENCES inventory.stores(id);


--
-- Name: stock_adjustment_items stock_adjustment_items_adjustment_id_stock_adjustments_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_adjustment_id_stock_adjustments_id_fk FOREIGN KEY (adjustment_id) REFERENCES inventory.stock_adjustments(id) ON DELETE CASCADE;


--
-- Name: stock_adjustment_items stock_adjustment_items_batch_id_item_batches_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_batch_id_item_batches_id_fk FOREIGN KEY (batch_id) REFERENCES inventory.item_batches(id);


--
-- Name: stock_adjustment_items stock_adjustment_items_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_adjustment_items
    ADD CONSTRAINT stock_adjustment_items_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: stock_adjustments stock_adjustments_approved_by_user_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_adjustments
    ADD CONSTRAINT stock_adjustments_approved_by_user_id_fk FOREIGN KEY (approved_by) REFERENCES public."user"(id);


--
-- Name: stock_adjustments stock_adjustments_created_by_user_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_adjustments
    ADD CONSTRAINT stock_adjustments_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: stock_adjustments stock_adjustments_store_id_stores_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_adjustments
    ADD CONSTRAINT stock_adjustments_store_id_stores_id_fk FOREIGN KEY (store_id) REFERENCES inventory.stores(id);


--
-- Name: stock_ledger stock_ledger_batch_id_item_batches_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_ledger
    ADD CONSTRAINT stock_ledger_batch_id_item_batches_id_fk FOREIGN KEY (batch_id) REFERENCES inventory.item_batches(id);


--
-- Name: stock_ledger stock_ledger_created_by_user_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_ledger
    ADD CONSTRAINT stock_ledger_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: stock_ledger stock_ledger_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_ledger
    ADD CONSTRAINT stock_ledger_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: stock_ledger stock_ledger_store_id_stores_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_ledger
    ADD CONSTRAINT stock_ledger_store_id_stores_id_fk FOREIGN KEY (store_id) REFERENCES inventory.stores(id);


--
-- Name: stock_requisition_items stock_requisition_items_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_requisition_items
    ADD CONSTRAINT stock_requisition_items_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: stock_requisition_items stock_requisition_items_requisition_id_stock_requisitions_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_requisition_items
    ADD CONSTRAINT stock_requisition_items_requisition_id_stock_requisitions_id_fk FOREIGN KEY (requisition_id) REFERENCES inventory.stock_requisitions(id) ON DELETE CASCADE;


--
-- Name: stock_requisitions stock_requisitions_approved_by_user_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_requisitions
    ADD CONSTRAINT stock_requisitions_approved_by_user_id_fk FOREIGN KEY (approved_by) REFERENCES public."user"(id);


--
-- Name: stock_requisitions stock_requisitions_fulfilling_store_id_stores_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_requisitions
    ADD CONSTRAINT stock_requisitions_fulfilling_store_id_stores_id_fk FOREIGN KEY (fulfilling_store_id) REFERENCES inventory.stores(id);


--
-- Name: stock_requisitions stock_requisitions_requested_by_user_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_requisitions
    ADD CONSTRAINT stock_requisitions_requested_by_user_id_fk FOREIGN KEY (requested_by) REFERENCES public."user"(id);


--
-- Name: stock_requisitions stock_requisitions_requesting_store_id_stores_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_requisitions
    ADD CONSTRAINT stock_requisitions_requesting_store_id_stores_id_fk FOREIGN KEY (requesting_store_id) REFERENCES inventory.stores(id);


--
-- Name: stock_transfer_items stock_transfer_items_batch_id_item_batches_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_batch_id_item_batches_id_fk FOREIGN KEY (batch_id) REFERENCES inventory.item_batches(id);


--
-- Name: stock_transfer_items stock_transfer_items_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: stock_transfer_items stock_transfer_items_transfer_id_stock_transfers_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_transfer_id_stock_transfers_id_fk FOREIGN KEY (transfer_id) REFERENCES inventory.stock_transfers(id) ON DELETE CASCADE;


--
-- Name: stock_transfers stock_transfers_dispatched_by_user_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_transfers
    ADD CONSTRAINT stock_transfers_dispatched_by_user_id_fk FOREIGN KEY (dispatched_by) REFERENCES public."user"(id);


--
-- Name: stock_transfers stock_transfers_from_store_id_stores_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_transfers
    ADD CONSTRAINT stock_transfers_from_store_id_stores_id_fk FOREIGN KEY (from_store_id) REFERENCES inventory.stores(id);


--
-- Name: stock_transfers stock_transfers_received_by_user_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_transfers
    ADD CONSTRAINT stock_transfers_received_by_user_id_fk FOREIGN KEY (received_by) REFERENCES public."user"(id);


--
-- Name: stock_transfers stock_transfers_requisition_id_stock_requisitions_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_transfers
    ADD CONSTRAINT stock_transfers_requisition_id_stock_requisitions_id_fk FOREIGN KEY (requisition_id) REFERENCES inventory.stock_requisitions(id);


--
-- Name: stock_transfers stock_transfers_to_store_id_stores_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stock_transfers
    ADD CONSTRAINT stock_transfers_to_store_id_stores_id_fk FOREIGN KEY (to_store_id) REFERENCES inventory.stores(id);


--
-- Name: store_batch_stock store_batch_stock_batch_id_item_batches_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.store_batch_stock
    ADD CONSTRAINT store_batch_stock_batch_id_item_batches_id_fk FOREIGN KEY (batch_id) REFERENCES inventory.item_batches(id) ON DELETE CASCADE;


--
-- Name: store_batch_stock store_batch_stock_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.store_batch_stock
    ADD CONSTRAINT store_batch_stock_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: store_batch_stock store_batch_stock_store_id_stores_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.store_batch_stock
    ADD CONSTRAINT store_batch_stock_store_id_stores_id_fk FOREIGN KEY (store_id) REFERENCES inventory.stores(id) ON DELETE CASCADE;


--
-- Name: store_staff_assignments store_staff_assignments_store_id_stores_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.store_staff_assignments
    ADD CONSTRAINT store_staff_assignments_store_id_stores_id_fk FOREIGN KEY (store_id) REFERENCES inventory.stores(id) ON DELETE CASCADE;


--
-- Name: stores stores_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: inventory; Owner: -
--

ALTER TABLE ONLY inventory.stores
    ADD CONSTRAINT stores_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: account account_userId_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: appointments appointments_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: daily_additional_income daily_additional_income_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_additional_income
    ADD CONSTRAINT daily_additional_income_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: daily_closing_reports daily_closing_reports_created_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_closing_reports
    ADD CONSTRAINT daily_closing_reports_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: daily_discounts_returns daily_discounts_returns_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_discounts_returns
    ADD CONSTRAINT daily_discounts_returns_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: daily_expenditures daily_expenditures_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_expenditures
    ADD CONSTRAINT daily_expenditures_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: daily_ipd_admissions daily_ipd_admissions_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_ipd_admissions
    ADD CONSTRAINT daily_ipd_admissions_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: daily_ipd_discharges daily_ipd_discharges_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_ipd_discharges
    ADD CONSTRAINT daily_ipd_discharges_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: daily_payment_channels daily_payment_channels_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_payment_channels
    ADD CONSTRAINT daily_payment_channels_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: daily_pharmacy_income daily_pharmacy_income_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_pharmacy_income
    ADD CONSTRAINT daily_pharmacy_income_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: daily_service_lines daily_service_lines_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_service_lines
    ADD CONSTRAINT daily_service_lines_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: daily_service_lines daily_service_lines_service_id_service_catalog_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_service_lines
    ADD CONSTRAINT daily_service_lines_service_id_service_catalog_id_fk FOREIGN KEY (service_id) REFERENCES public.service_catalog(id) ON DELETE SET NULL;


--
-- Name: daily_staff_advances daily_staff_advances_report_id_daily_closing_reports_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_staff_advances
    ADD CONSTRAINT daily_staff_advances_report_id_daily_closing_reports_id_fk FOREIGN KEY (report_id) REFERENCES public.daily_closing_reports(id) ON DELETE CASCADE;


--
-- Name: department_leaders department_leaders_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_leaders
    ADD CONSTRAINT department_leaders_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: encounters encounters_appointment_id_appointments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_appointment_id_appointments_id_fk FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: grn_items grn_items_grn_id_grns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_grn_id_grns_id_fk FOREIGN KEY (grn_id) REFERENCES public.grns(id) ON DELETE CASCADE;


--
-- Name: grn_items grn_items_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: grn_items grn_items_po_item_id_po_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_po_item_id_po_items_id_fk FOREIGN KEY (po_item_id) REFERENCES public.po_items(id);


--
-- Name: grn_items grn_items_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unit_types(id);


--
-- Name: grns grns_created_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grns
    ADD CONSTRAINT grns_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: grns grns_po_id_purchase_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grns
    ADD CONSTRAINT grns_po_id_purchase_orders_id_fk FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id);


--
-- Name: grns grns_vendor_id_vendors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grns
    ADD CONSTRAINT grns_vendor_id_vendors_id_fk FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: immunization_records immunization_records_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immunization_records
    ADD CONSTRAINT immunization_records_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: immunization_records immunization_records_schedule_id_immunization_schedules_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.immunization_records
    ADD CONSTRAINT immunization_records_schedule_id_immunization_schedules_id_fk FOREIGN KEY (schedule_id) REFERENCES public.immunization_schedules(id) ON DELETE SET NULL;


--
-- Name: item_unit_prices item_unit_prices_item_id_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_unit_prices
    ADD CONSTRAINT item_unit_prices_item_id_items_id_fk FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;


--
-- Name: item_unit_prices item_unit_prices_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_unit_prices
    ADD CONSTRAINT item_unit_prices_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unit_types(id);


--
-- Name: items items_base_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_base_unit_id_fkey FOREIGN KEY (base_unit_id) REFERENCES public.unit_types(id);


--
-- Name: items items_item_type_id_item_types_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_item_type_id_item_types_id_fk FOREIGN KEY (item_type_id) REFERENCES public.item_types(id);


--
-- Name: items items_purchase_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_purchase_unit_id_fkey FOREIGN KEY (purchase_unit_id) REFERENCES public.unit_types(id);


--
-- Name: items items_sale_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_sale_unit_id_fkey FOREIGN KEY (sale_unit_id) REFERENCES public.unit_types(id);


--
-- Name: messages messages_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: messages messages_receiver_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_id_user_id_fk FOREIGN KEY (receiver_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_user_id_fk FOREIGN KEY (sender_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: monthly_bank_expenses monthly_bank_expenses_created_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_bank_expenses
    ADD CONSTRAINT monthly_bank_expenses_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: monthly_bank_expenses monthly_bank_expenses_vendor_id_vendors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_bank_expenses
    ADD CONSTRAINT monthly_bank_expenses_vendor_id_vendors_id_fk FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: nursing_academic_schedules nursing_academic_schedules_batch_id_nursing_batches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_academic_schedules
    ADD CONSTRAINT nursing_academic_schedules_batch_id_nursing_batches_id_fk FOREIGN KEY (batch_id) REFERENCES public.nursing_batches(id) ON DELETE CASCADE;


--
-- Name: nursing_applicants nursing_applicants_course_id_nursing_courses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_applicants
    ADD CONSTRAINT nursing_applicants_course_id_nursing_courses_id_fk FOREIGN KEY (course_id) REFERENCES public.nursing_courses(id);


--
-- Name: nursing_applicants nursing_applicants_referrer_id_nursing_referrers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_applicants
    ADD CONSTRAINT nursing_applicants_referrer_id_nursing_referrers_id_fk FOREIGN KEY (referrer_id) REFERENCES public.nursing_referrers(id) ON DELETE SET NULL;


--
-- Name: nursing_attendance_records nursing_attendance_records_batch_id_nursing_batches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_attendance_records
    ADD CONSTRAINT nursing_attendance_records_batch_id_nursing_batches_id_fk FOREIGN KEY (batch_id) REFERENCES public.nursing_batches(id) ON DELETE CASCADE;


--
-- Name: nursing_attendance_records nursing_attendance_records_marked_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_attendance_records
    ADD CONSTRAINT nursing_attendance_records_marked_by_user_id_fk FOREIGN KEY (marked_by) REFERENCES public."user"(id);


--
-- Name: nursing_attendance_records nursing_attendance_records_student_id_nursing_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_attendance_records
    ADD CONSTRAINT nursing_attendance_records_student_id_nursing_students_id_fk FOREIGN KEY (student_id) REFERENCES public.nursing_students(id) ON DELETE CASCADE;


--
-- Name: nursing_audit_logs nursing_audit_logs_changed_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_audit_logs
    ADD CONSTRAINT nursing_audit_logs_changed_by_user_id_fk FOREIGN KEY (changed_by) REFERENCES public."user"(id);


--
-- Name: nursing_batches nursing_batches_course_id_nursing_courses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_batches
    ADD CONSTRAINT nursing_batches_course_id_nursing_courses_id_fk FOREIGN KEY (course_id) REFERENCES public.nursing_courses(id) ON DELETE CASCADE;


--
-- Name: nursing_fee_structures nursing_fee_structures_course_id_nursing_courses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_fee_structures
    ADD CONSTRAINT nursing_fee_structures_course_id_nursing_courses_id_fk FOREIGN KEY (course_id) REFERENCES public.nursing_courses(id) ON DELETE CASCADE;


--
-- Name: nursing_fee_transactions nursing_fee_transactions_applicant_id_nursing_applicants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_fee_transactions
    ADD CONSTRAINT nursing_fee_transactions_applicant_id_nursing_applicants_id_fk FOREIGN KEY (applicant_id) REFERENCES public.nursing_applicants(id) ON DELETE SET NULL;


--
-- Name: nursing_fee_transactions nursing_fee_transactions_collected_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_fee_transactions
    ADD CONSTRAINT nursing_fee_transactions_collected_by_user_id_fk FOREIGN KEY (collected_by) REFERENCES public."user"(id);


--
-- Name: nursing_fee_transactions nursing_fee_transactions_fee_structure_id_nursing_fee_structure; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_fee_transactions
    ADD CONSTRAINT nursing_fee_transactions_fee_structure_id_nursing_fee_structure FOREIGN KEY (fee_structure_id) REFERENCES public.nursing_fee_structures(id);


--
-- Name: nursing_fee_transactions nursing_fee_transactions_student_id_nursing_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_fee_transactions
    ADD CONSTRAINT nursing_fee_transactions_student_id_nursing_students_id_fk FOREIGN KEY (student_id) REFERENCES public.nursing_students(id) ON DELETE CASCADE;


--
-- Name: nursing_referrer_payment_allocations nursing_referrer_payment_allocations_applicant_id_nursing_appli; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_referrer_payment_allocations
    ADD CONSTRAINT nursing_referrer_payment_allocations_applicant_id_nursing_appli FOREIGN KEY (applicant_id) REFERENCES public.nursing_applicants(id) ON DELETE SET NULL;


--
-- Name: nursing_referrer_payment_allocations nursing_referrer_payment_allocations_payment_id_nursing_referre; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_referrer_payment_allocations
    ADD CONSTRAINT nursing_referrer_payment_allocations_payment_id_nursing_referre FOREIGN KEY (payment_id) REFERENCES public.nursing_referrer_payments(id) ON DELETE CASCADE;


--
-- Name: nursing_referrer_payment_allocations nursing_referrer_payment_allocations_student_id_nursing_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_referrer_payment_allocations
    ADD CONSTRAINT nursing_referrer_payment_allocations_student_id_nursing_student FOREIGN KEY (student_id) REFERENCES public.nursing_students(id) ON DELETE SET NULL;


--
-- Name: nursing_referrer_payments nursing_referrer_payments_paid_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_referrer_payments
    ADD CONSTRAINT nursing_referrer_payments_paid_by_user_id_fk FOREIGN KEY (paid_by) REFERENCES public."user"(id);


--
-- Name: nursing_referrer_payments nursing_referrer_payments_referrer_id_nursing_referrers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_referrer_payments
    ADD CONSTRAINT nursing_referrer_payments_referrer_id_nursing_referrers_id_fk FOREIGN KEY (referrer_id) REFERENCES public.nursing_referrers(id) ON DELETE CASCADE;


--
-- Name: nursing_student_documents nursing_student_documents_applicant_id_nursing_applicants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_student_documents
    ADD CONSTRAINT nursing_student_documents_applicant_id_nursing_applicants_id_fk FOREIGN KEY (applicant_id) REFERENCES public.nursing_applicants(id) ON DELETE CASCADE;


--
-- Name: nursing_student_documents nursing_student_documents_student_id_nursing_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_student_documents
    ADD CONSTRAINT nursing_student_documents_student_id_nursing_students_id_fk FOREIGN KEY (student_id) REFERENCES public.nursing_students(id) ON DELETE CASCADE;


--
-- Name: nursing_student_documents nursing_student_documents_verified_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_student_documents
    ADD CONSTRAINT nursing_student_documents_verified_by_user_id_fk FOREIGN KEY (verified_by) REFERENCES public."user"(id);


--
-- Name: nursing_student_fee_frequencies nursing_student_fee_frequencies_student_id_nursing_students_id_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_student_fee_frequencies
    ADD CONSTRAINT nursing_student_fee_frequencies_student_id_nursing_students_id_ FOREIGN KEY (student_id) REFERENCES public.nursing_students(id) ON DELETE CASCADE;


--
-- Name: nursing_students nursing_students_applicant_id_nursing_applicants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_students
    ADD CONSTRAINT nursing_students_applicant_id_nursing_applicants_id_fk FOREIGN KEY (applicant_id) REFERENCES public.nursing_applicants(id) ON DELETE SET NULL;


--
-- Name: nursing_students nursing_students_batch_id_nursing_batches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_students
    ADD CONSTRAINT nursing_students_batch_id_nursing_batches_id_fk FOREIGN KEY (batch_id) REFERENCES public.nursing_batches(id);


--
-- Name: nursing_students nursing_students_referrer_id_nursing_referrers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_students
    ADD CONSTRAINT nursing_students_referrer_id_nursing_referrers_id_fk FOREIGN KEY (referrer_id) REFERENCES public.nursing_referrers(id) ON DELETE SET NULL;


--
-- Name: nursing_subjects nursing_subjects_course_id_nursing_courses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nursing_subjects
    ADD CONSTRAINT nursing_subjects_course_id_nursing_courses_id_fk FOREIGN KEY (course_id) REFERENCES public.nursing_courses(id) ON DELETE CASCADE;


--
-- Name: po_items po_items_po_id_purchase_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_items
    ADD CONSTRAINT po_items_po_id_purchase_orders_id_fk FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: po_items po_items_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_items
    ADD CONSTRAINT po_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unit_types(id);


--
-- Name: po_payments po_payments_created_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_payments
    ADD CONSTRAINT po_payments_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: po_payments po_payments_po_id_purchase_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_payments
    ADD CONSTRAINT po_payments_po_id_purchase_orders_id_fk FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: prescription_lines prescription_lines_medicine_id_medicines_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_lines
    ADD CONSTRAINT prescription_lines_medicine_id_medicines_id_fk FOREIGN KEY (medicine_id) REFERENCES public.medicines(id);


--
-- Name: prescription_lines prescription_lines_prescription_id_prescriptions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_lines
    ADD CONSTRAINT prescription_lines_prescription_id_prescriptions_id_fk FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_encounter_id_encounters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_encounter_id_encounters_id_fk FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: prescriptions prescriptions_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: purchase_orders purchase_orders_created_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_user_id_fk FOREIGN KEY (created_by) REFERENCES public."user"(id);


--
-- Name: purchase_orders purchase_orders_vendor_id_vendors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_vendor_id_vendors_id_fk FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: report_category_exclusions report_category_exclusions_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_category_exclusions
    ADD CONSTRAINT report_category_exclusions_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: rosters rosters_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rosters
    ADD CONSTRAINT rosters_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: rosters rosters_shift_id_shifts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rosters
    ADD CONSTRAINT rosters_shift_id_shifts_id_fk FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: security_deposit_refunds security_deposit_refunds_processed_by_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_deposit_refunds
    ADD CONSTRAINT security_deposit_refunds_processed_by_user_id_fk FOREIGN KEY (processed_by) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: session session_userId_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: staff_departments staff_departments_changed_by_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_departments
    ADD CONSTRAINT staff_departments_changed_by_id_user_id_fk FOREIGN KEY (changed_by_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: staff_departments staff_departments_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_departments
    ADD CONSTRAINT staff_departments_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: staff_departments staff_departments_staff_id_staff_version_staff_staff_id_version; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_departments
    ADD CONSTRAINT staff_departments_staff_id_staff_version_staff_staff_id_version FOREIGN KEY (staff_id, staff_version) REFERENCES public.staff(staff_id, version) ON DELETE CASCADE;


--
-- Name: staff_hr_profiles staff_hr_profiles_staff_id_staff_version_staff_staff_id_version; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_hr_profiles
    ADD CONSTRAINT staff_hr_profiles_staff_id_staff_version_staff_staff_id_version FOREIGN KEY (staff_id, staff_version) REFERENCES public.staff(staff_id, version) ON DELETE CASCADE;


--
-- Name: staff_off_day_requests staff_off_day_requests_reviewed_by_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_off_day_requests
    ADD CONSTRAINT staff_off_day_requests_reviewed_by_id_user_id_fk FOREIGN KEY (reviewed_by_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: staff_salaries staff_salaries_staff_id_staff_version_staff_staff_id_version_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_salaries
    ADD CONSTRAINT staff_salaries_staff_id_staff_version_staff_staff_id_version_fk FOREIGN KEY (staff_id, staff_version) REFERENCES public.staff(staff_id, version) ON DELETE CASCADE;


--
-- Name: staff_supervisors staff_supervisors_staff_id_staff_version_staff_staff_id_version; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_supervisors
    ADD CONSTRAINT staff_supervisors_staff_id_staff_version_staff_staff_id_version FOREIGN KEY (staff_id, staff_version) REFERENCES public.staff(staff_id, version) ON DELETE CASCADE;


--
-- Name: staff staff_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: unit_conversions unit_conversions_from_unit_id_unit_types_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_conversions
    ADD CONSTRAINT unit_conversions_from_unit_id_unit_types_id_fk FOREIGN KEY (from_unit_id) REFERENCES public.unit_types(id) ON DELETE CASCADE;


--
-- Name: unit_conversions unit_conversions_to_unit_id_unit_types_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_conversions
    ADD CONSTRAINT unit_conversions_to_unit_id_unit_types_id_fk FOREIGN KEY (to_unit_id) REFERENCES public.unit_types(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 2rk7AlcX9yTSSkQS0xZwhW4G6IK4Lf6ARK1GkOx7T1RMs5ceFQw4hvCFroOvabs

