import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Search, ExternalLink, Filter, Pencil, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { EditStudentModal, StudentProfileData } from "@/components/EditStudentModal";

import { CollegeAccessGuard } from "@/components/CollegeAccessGuard";

export const Route = createFileRoute("/_authenticated/college/students")({
  component: () => (
    <CollegeAccessGuard>
      <StudentDirectoryPage />
    </CollegeAccessGuard>
  ),
});

interface Student {
  id: number;
  enrollmentNo: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  dob?: string;
  address?: string;
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
}

function StudentDirectoryPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [batchFilter, setBatchFilter] = React.useState("");
  const [courseFilter, setCourseFilter] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);

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

  const students = responseData?.data || [];
  const pagination = responseData?.pagination;

  const hasActiveFilters = Boolean(searchQuery || statusFilter || batchFilter || courseFilter || genderFilter);

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter("");
    setBatchFilter("");
    setCourseFilter("");
    setGenderFilter("");
    setCurrentPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-teal-600" />
            Student Master Directory
          </h1>
          <p className="text-sm text-muted-foreground">
            Searchable repository of active, promoted, and graduated nursing college students.
          </p>
        </div>

        <Link to={"/college/admissions" as any}>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white">
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
                placeholder="Search by student name, enrollment no, email, or phone..."
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
            <CardDescription>Master roster of nursing students</CardDescription>
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
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Course Program</th>
                      <th className="p-3">Batch & Section</th>
                      <th className="p-3">Admission Date</th>
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
                        </td>
                        <td className="p-3">
                          <Link to="/college/student/$id" params={{ id: String(student.id) }} className="font-medium hover:underline text-foreground">
                            {student.name}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {[student.email, student.phone].filter(Boolean).join(" • ") || "No contact provided"}
                          </div>
                        </td>
                        <td className="p-3">{student.courseName}</td>
                        <td className="p-3">{student.academicYear} ({student.section})</td>
                        <td className="p-3 text-xs">{student.admissionDate || "N/A"}</td>
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
                              onClick={() => {
                                setSelectedStudent(student);
                                setEditModalOpen(true);
                              }}
                            >
                              <Pencil size={12} /> Edit
                            </Button>
                            <Link to="/college/student/$id" params={{ id: String(student.id) }}>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground">
                                Profile <ExternalLink size={12} />
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

      {/* Edit Student Modal */}
      <EditStudentModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        student={selectedStudent}
      />
    </div>
  );
}
