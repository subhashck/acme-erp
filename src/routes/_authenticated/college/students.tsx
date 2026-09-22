import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { 
  GraduationCap, 
  Search, 
  ExternalLink, 
  Filter, 
  Pencil, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  RotateCcw,
  Eye,
  User,
  Users,
  MapPin,
  BookOpen,
  Award,
  Tag,
  Phone,
  Mail,
  Calendar,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { EditStudentModal, StudentProfileData, ExamDetail } from "@/components/EditStudentModal";
import { cn } from "@/utils/cn";

export const Route = createFileRoute("/_authenticated/college/students")({
  component: StudentDirectoryPage,
});

interface Student {
  id: number;
  applicantId?: number | null;
  enrollmentNo: string;
  name: string;
  email: string;
  phone: string;
  aadharNo?: string | null;
  gender: string;
  dob?: string;
  address?: string;
  fatherName?: string | null;
  fatherPhone?: string | null;
  fatherAadharNo?: string | null;
  fatherOccupation?: string | null;
  fatherOrganization?: string | null;
  fatherAnnualIncome?: string | number | null;
  motherName?: string | null;
  motherPhone?: string | null;
  motherAadharNo?: string | null;
  motherOccupation?: string | null;
  motherOrganization?: string | null;
  motherAnnualIncome?: string | number | null;
  presentAddress?: string | null;
  presentDistrict?: string | null;
  presentPincode?: string | null;
  presentState?: string | null;
  permanentAddress?: string | null;
  permanentDistrict?: string | null;
  permanentPincode?: string | null;
  permanentState?: string | null;
  academicHistory?: ExamDetail[] | string | null;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  status: string;
  batchId: number;
  academicYear: string;
  section: string;
  courseId: number;
  courseName: string;
  admissionDate: string;
  applicationNo?: string | null;
  quotaCategory?: "general" | "reserved" | "management" | null;
  entranceMeritScore?: string | number | null;
  applicantNotes?: string | null;
  seatBookingAmount?: string | number | null;
  seatBookingStatus?: string | null;
}

function StudentDirectoryPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [batchFilter, setBatchFilter] = React.useState("");
  const [courseFilter, setCourseFilter] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState("");
  const [quotaFilter, setQuotaFilter] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [quickViewModalOpen, setQuickViewModalOpen] = React.useState(false);
  const [quickViewStudent, setQuickViewStudent] = React.useState<Student | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["nursing", "courses"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/courses");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: batches = [] } = useQuery<any[]>({
    queryKey: ["nursing", "batches"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/batches");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: responseData, isLoading } = useQuery<{
    data: Student[];
    pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
  }>({
    queryKey: ["nursing", "students", debouncedSearch, statusFilter, batchFilter, courseFilter, genderFilter, currentPage, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (statusFilter) params.append("status", statusFilter);
      if (batchFilter) params.append("batchId", batchFilter);
      if (courseFilter) params.append("courseId", courseFilter);
      if (genderFilter) params.append("gender", genderFilter);
      params.append("page", String(currentPage));
      params.append("pageSize", String(pageSize));
      const res = await fetch(`/api/nursing/students?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch students");
      const json = await res.json();
      if (Array.isArray(json)) {
        return {
          data: json,
          pagination: { page: 1, pageSize: json.length, totalRecords: json.length, totalPages: 1 },
        };
      }
      return json;
    },
  });

  let students = responseData?.data || [];
  if (quotaFilter) {
    students = students.filter((s) => (s.quotaCategory || "general") === quotaFilter);
  }
  const pagination = responseData?.pagination;

  const hasActiveFilters = Boolean(searchQuery || statusFilter || batchFilter || courseFilter || genderFilter || quotaFilter);

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter("");
    setBatchFilter("");
    setCourseFilter("");
    setGenderFilter("");
    setQuotaFilter("");
    setCurrentPage(1);
  };

  const openQuickView = (student: Student) => {
    setQuickViewStudent(student);
    setQuickViewModalOpen(true);
  };

  // Parse Academic History for Quick View
  let parsedQuickViewHistory: ExamDetail[] = [];
  if (quickViewStudent?.academicHistory) {
    if (typeof quickViewStudent.academicHistory === "string") {
      try {
        parsedQuickViewHistory = JSON.parse(quickViewStudent.academicHistory);
      } catch {
        parsedQuickViewHistory = [];
      }
    } else if (Array.isArray(quickViewStudent.academicHistory)) {
      parsedQuickViewHistory = quickViewStudent.academicHistory;
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-teal-600" />
            Student Master Directory
          </h1>
          <p className="text-sm text-muted-foreground">
            Searchable master repository of enrolled, active, and graduated nursing college students with complete admission records.
          </p>
        </div>

        <Link to={"/college/admissions" as any}>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
            Enrol New Student
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by student name, enrollment no, Aadhar, application no, or parents..."
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm bg-background text-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={courseFilter}
                onChange={(e) => {
                  setCourseFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Programs</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={batchFilter}
                onChange={(e) => {
                  setBatchFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.academicYear} ({b.section})
                  </option>
                ))}
              </select>

              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="promoted">Promoted</option>
                <option value="graduated">Graduated</option>
                <option value="dropped">Dropped</option>
                <option value="transferred">Transferred</option>
              </select>

              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Genders</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>

              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={quotaFilter}
                onChange={(e) => {
                  setQuotaFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Quotas</option>
                <option value="general">General Merit</option>
                <option value="reserved">Reserved</option>
                <option value="management">Management</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
              <span>Filters active</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
                onClick={handleResetFilters}
              >
                <RotateCcw size={11} /> Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Enrolled Students {pagination ? `(${pagination.totalRecords})` : `(${students.length})`}
            </CardTitle>
            <CardDescription>Master roster of nursing students with admission & parent profiles</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading student directory...</div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No student records found matching filter criteria.</div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                      <th className="p-3">Enrollment No</th>
                      <th className="p-3">Student Name & Contact</th>
                      <th className="p-3">Aadhar & Quota</th>
                      <th className="p-3">Course Program</th>
                      <th className="p-3">Batch & Section</th>
                      <th className="p-3">Parents / Guardian</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-muted/30">
                        <td className="p-3 font-semibold font-mono text-teal-600 dark:text-teal-400">
                          <Link to="/college/student/$id" params={{ id: String(student.id) }} className="hover:underline">
                            {student.enrollmentNo}
                          </Link>
                          {student.applicationNo && (
                            <div className="text-[11px] text-muted-foreground font-mono">
                              App: {student.applicationNo}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <Link to="/college/student/$id" params={{ id: String(student.id) }} className="font-medium hover:underline text-foreground">
                            {student.name}
                          </Link>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                            <span>{student.phone}</span>
                            {student.email && <span>• {student.email}</span>}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-mono text-xs text-foreground">
                            {student.aadharNo ? student.aadharNo.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3") : "N/A"}
                          </div>
                          <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-semibold uppercase bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {student.quotaCategory || "General"}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-foreground">{student.courseName}</td>
                        <td className="p-3 text-muted-foreground">
                          {student.academicYear} ({student.section})
                          {student.admissionDate && (
                            <div className="text-[11px] text-muted-foreground">
                              Adm: {student.admissionDate}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-xs text-foreground">
                          <div>F: {student.fatherName || "N/A"}</div>
                          <div>M: {student.motherName || "N/A"}</div>
                        </td>
                        <td className="p-3">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {student.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs flex items-center gap-1 text-teal-600 hover:text-teal-700"
                              onClick={() => openQuickView(student)}
                              title="Quick View Admission Details"
                            >
                              <Eye size={13} /> View
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs flex items-center gap-1 text-teal-600 hover:text-teal-700"
                              onClick={() => {
                                setSelectedStudent(student);
                                setEditModalOpen(true);
                              }}
                              title="Edit All Profile Details"
                            >
                              <Pencil size={13} /> Edit
                            </Button>

                            <Link to="/college/student/$id" params={{ id: String(student.id) }}>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground" title="Open 360 Full Profile">
                                Full Profile <ExternalLink size={12} />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Server-Side Pagination Controls */}
              {pagination && pagination.totalRecords > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>
                      Showing{" "}
                      <strong className="text-foreground">
                        {(pagination.page - 1) * pagination.pageSize + 1}
                      </strong>{" "}
                      to{" "}
                      <strong className="text-foreground">
                        {Math.min(pagination.page * pagination.pageSize, pagination.totalRecords)}
                      </strong>{" "}
                      of{" "}
                      <strong className="text-foreground">{pagination.totalRecords}</strong> students
                    </span>

                    <div className="flex items-center gap-1.5 pl-2 border-l">
                      <span>Per page:</span>
                      <select
                        className="border rounded px-1.5 py-0.5 text-xs bg-background text-foreground"
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(1)}
                      disabled={pagination.page <= 1}
                      title="First Page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page <= 1}
                      title="Previous Page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-2.5 font-medium text-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={pagination.page >= pagination.totalPages}
                      title="Next Page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(pagination.totalPages)}
                      disabled={pagination.page >= pagination.totalPages}
                      title="Last Page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick View Admission Details Modal */}
      <Dialog open={quickViewModalOpen} onOpenChange={setQuickViewModalOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-none h-[calc(100dvh-1rem)] sm:!w-[96vw] sm:!max-w-[96vw] lg:!w-[94vw] lg:!max-w-[1200px] xl:!max-w-[1400px] sm:h-auto sm:max-h-[92dvh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl sm:rounded-3xl border-border/70 shadow-2xl">
          <DialogHeader className="relative overflow-hidden border-b bg-linear-to-br from-teal-600 via-teal-600 to-cyan-700 p-4 pr-12 text-left sm:p-6 sm:pr-14">
            <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/10 blur-sm" />
            <div className="relative flex items-start gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-lg font-black text-white shadow-sm backdrop-blur-sm sm:h-14 sm:w-14 sm:text-xl">
                {quickViewStudent?.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "ST"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="truncate text-lg font-bold text-white sm:text-2xl">
                    {quickViewStudent?.name}
                  </DialogTitle>
                  <span className="rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                    {quickViewStudent?.status || "Active"}
                  </span>
                </div>
                <DialogDescription className="mt-1.5 flex flex-col gap-1 text-xs text-teal-50 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:text-sm">
                  <span className="font-mono font-bold text-white">{quickViewStudent?.enrollmentNo}</span>
                  <span className="hidden text-white/50 sm:inline">•</span>
                  <span className="truncate">{quickViewStudent?.courseName} · {quickViewStudent?.academicYear}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {quickViewStudent && (
            <div className="flex-1 overflow-y-auto overscroll-contain bg-muted/10 p-3 space-y-3 text-sm sm:p-5 sm:space-y-5">
              {/* Basic & Quota info */}
              <div className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-xs space-y-3 sm:p-5">
                <div className="font-bold text-xs text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10"><User size={14} /></span>
                  Identification & Admission
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs min-[480px]:grid-cols-2 lg:grid-cols-3 [&>div]:min-w-0 [&>div]:rounded-xl [&>div]:border [&>div]:border-border/60 [&>div]:bg-muted/20 [&>div]:p-2.5 [&_span]:block [&_span]:mb-1 [&_span]:text-[10px] [&_span]:font-semibold [&_span]:uppercase [&_span]:tracking-wide [&_strong]:block [&_strong]:truncate">
                  <div>
                    <span className="text-muted-foreground">Application No: </span>
                    <strong className="text-foreground">{quickViewStudent.applicationNo || "Direct Admission"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Aadhar No: </span>
                    <strong className="font-mono text-foreground">{quickViewStudent.aadharNo || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gender: </span>
                    <strong className="text-foreground">{quickViewStudent.gender || "Female"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date of Birth: </span>
                    <strong className="text-foreground">{quickViewStudent.dob || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone: </span>
                    <strong className="text-foreground">{quickViewStudent.phone}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    <strong className="text-foreground">{quickViewStudent.email}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quota: </span>
                    <strong className="text-teal-600 capitalize">{quickViewStudent.quotaCategory || "General"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Merit Score: </span>
                    <strong className="text-foreground">{quickViewStudent.entranceMeritScore ? `${quickViewStudent.entranceMeritScore}%` : "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Admission Date: </span>
                    <strong className="text-foreground">{quickViewStudent.admissionDate || "N/A"}</strong>
                  </div>
                </div>
              </div>

              {/* Parents details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3.5 bg-card border border-border/70 rounded-2xl space-y-2 text-xs shadow-xs sm:p-4 [&>div:not(:first-child)]:flex [&>div:not(:first-child)]:justify-between [&>div:not(:first-child)]:gap-3 [&>div:not(:first-child)]:border-b [&>div:not(:first-child)]:border-border/40 [&>div:not(:first-child)]:pb-1.5 [&_strong]:text-right [&_strong]:break-words">
                  <div className="font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10"><User size={14} /></span> Father's Profile
                  </div>
                  <div>Name: <strong className="text-foreground">{quickViewStudent.fatherName || "N/A"}</strong></div>
                  <div>Contact: <strong className="text-foreground">{quickViewStudent.fatherPhone || "N/A"}</strong></div>
                  <div>Aadhar: <strong className="font-mono text-foreground">{quickViewStudent.fatherAadharNo || "N/A"}</strong></div>
                  <div>Occupation: <strong className="text-foreground">{quickViewStudent.fatherOccupation || "N/A"}</strong></div>
                  <div>Organization: <strong className="text-foreground">{quickViewStudent.fatherOrganization || "N/A"}</strong></div>
                  <div>Annual Income: <strong className="text-foreground">{quickViewStudent.fatherAnnualIncome ? `₹${Number(quickViewStudent.fatherAnnualIncome).toLocaleString()}` : "N/A"}</strong></div>
                </div>

                <div className="p-3.5 bg-card border border-border/70 rounded-2xl space-y-2 text-xs shadow-xs sm:p-4 [&>div:not(:first-child)]:flex [&>div:not(:first-child)]:justify-between [&>div:not(:first-child)]:gap-3 [&>div:not(:first-child)]:border-b [&>div:not(:first-child)]:border-border/40 [&>div:not(:first-child)]:pb-1.5 [&_strong]:text-right [&_strong]:break-words">
                  <div className="font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10"><User size={14} /></span> Mother's Profile
                  </div>
                  <div>Name: <strong className="text-foreground">{quickViewStudent.motherName || "N/A"}</strong></div>
                  <div>Contact: <strong className="text-foreground">{quickViewStudent.motherPhone || "N/A"}</strong></div>
                  <div>Aadhar: <strong className="font-mono text-foreground">{quickViewStudent.motherAadharNo || "N/A"}</strong></div>
                  <div>Occupation: <strong className="text-foreground">{quickViewStudent.motherOccupation || "N/A"}</strong></div>
                  <div>Organization: <strong className="text-foreground">{quickViewStudent.motherOrganization || "N/A"}</strong></div>
                  <div>Annual Income: <strong className="text-foreground">{quickViewStudent.motherAnnualIncome ? `₹${Number(quickViewStudent.motherAnnualIncome).toLocaleString()}` : "N/A"}</strong></div>
                </div>
              </div>

              {/* Addresses */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3.5 bg-card border border-border/70 rounded-2xl text-xs space-y-1.5 shadow-xs sm:p-4">
                  <div className="font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10"><MapPin size={14} /></span> Present Address
                  </div>
                  <p className="text-foreground">{quickViewStudent.presentAddress || quickViewStudent.address || "Not specified"}</p>
                  <div className="text-muted-foreground">
                    {[quickViewStudent.presentDistrict, quickViewStudent.presentState, quickViewStudent.presentPincode].filter(Boolean).join(", ") || ""}
                  </div>
                </div>

                <div className="p-3.5 bg-card border border-border/70 rounded-2xl text-xs space-y-1.5 shadow-xs sm:p-4">
                  <div className="font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10"><MapPin size={14} /></span> Permanent Address
                  </div>
                  <p className="text-foreground">{quickViewStudent.permanentAddress || "Same as present address"}</p>
                  <div className="text-muted-foreground">
                    {[quickViewStudent.permanentDistrict, quickViewStudent.permanentState, quickViewStudent.permanentPincode].filter(Boolean).join(", ") || ""}
                  </div>
                </div>
              </div>

              {/* Academic History */}
              {parsedQuickViewHistory.length > 0 && (
                <div className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-xs space-y-3 sm:p-4">
                  <div className="font-bold text-xs text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10"><BookOpen size={14} /></span> Previous Academic History
                  </div>
                  <div className="border border-border/70 rounded-xl overflow-x-auto">
                    <table className="w-full min-w-[720px] text-xs text-left border-collapse">
                      <thead className="bg-muted/40 text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-2">Exam</th>
                          <th className="p-2">School / Institute</th>
                          <th className="p-2">Board</th>
                          <th className="p-2">Year</th>
                          <th className="p-2">Score</th>
                          <th className="p-2">Subjects</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {parsedQuickViewHistory.map((h, i) => (
                          <tr key={i}>
                            <td className="p-2 font-semibold text-teal-700 dark:text-teal-400">{h.exam}</td>
                            <td className="p-2">{h.instituteName || "N/A"}</td>
                            <td className="p-2">{h.board || "N/A"}</td>
                            <td className="p-2">{h.year || "N/A"}</td>
                            <td className="p-2 font-bold text-emerald-600">{h.percentage ? `${h.percentage}%` : "N/A"}</td>
                            <td className="p-2">{h.subjects || "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="shrink-0 border-t bg-background/95 p-3 backdrop-blur-sm flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            {quickViewStudent && (
              <Link className="w-full sm:w-auto" to="/college/student/$id" params={{ id: String(quickViewStudent.id) }}>
                <Button variant="outline" size="sm" className="w-full sm:w-auto flex items-center justify-center gap-1 text-xs">
                  Full 360 Profile <ExternalLink size={12} />
                </Button>
              </Link>
            )}
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuickViewModalOpen(false);
                  if (quickViewStudent) {
                    setSelectedStudent(quickViewStudent);
                    setEditModalOpen(true);
                  }
                }}
              >
                <Pencil size={12} className="mr-1" /> Edit Profile
              </Button>
              <Button size="sm" onClick={() => setQuickViewModalOpen(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Modal */}
      <EditStudentModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        student={selectedStudent}
      />
    </div>
  );
}
