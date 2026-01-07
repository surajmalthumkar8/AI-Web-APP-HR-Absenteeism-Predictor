/**
 * Employees Page.
 *
 * Data table with employee absence records, filtering, and sorting.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  User,
} from 'lucide-react';
import Header from '../components/layout/Header';
import { getEmployees, EmployeeFilters } from '../api';
import type { Employee } from '../types';

export default function Employees() {
  const [filters, setFilters] = useState<EmployeeFilters>({
    page: 1,
    page_size: 15,
    sort_by: 'absenteeism_hours',
    sort_order: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch employees with filters
  const { data, isLoading } = useQuery({
    queryKey: ['employees', filters],
    queryFn: () => getEmployees(filters),
  });

  // Handle sort
  const handleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sort_by: field,
      sort_order: prev.sort_by === field && prev.sort_order === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  // Handle filter change
  const handleFilterChange = (key: keyof EmployeeFilters, value: number | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  // Risk level based on absence hours
  const getRiskClass = (hours: number) => {
    if (hours <= 4) return 'text-green-600';
    if (hours <= 8) return 'text-yellow-600';
    if (hours <= 16) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div>
      <Header
        title="Employees"
        subtitle="View and filter employee absence records"
      />

      <div className="p-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-outline flex items-center gap-2 ${showFilters ? 'bg-gray-100' : ''}`}
            >
              <Filter size={16} />
              Filters
            </button>
            {data && (
              <span className="text-sm text-gray-500">
                {data.total.toLocaleString()} records found
              </span>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="card mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Min Age</label>
                <input
                  type="number"
                  placeholder="Any"
                  className="input"
                  value={filters.min_age || ''}
                  onChange={(e) =>
                    handleFilterChange('min_age', e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </div>
              <div>
                <label className="label">Max Age</label>
                <input
                  type="number"
                  placeholder="Any"
                  className="input"
                  value={filters.max_age || ''}
                  onChange={(e) =>
                    handleFilterChange('max_age', e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </div>
              <div>
                <label className="label">Min Absence Hours</label>
                <input
                  type="number"
                  placeholder="Any"
                  className="input"
                  value={filters.min_absence || ''}
                  onChange={(e) =>
                    handleFilterChange('min_absence', e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </div>
              <div>
                <label className="label">Max Absence Hours</label>
                <input
                  type="number"
                  placeholder="Any"
                  className="input"
                  value={filters.max_absence || ''}
                  onChange={(e) =>
                    handleFilterChange('max_absence', e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </div>
              <div>
                <label className="label">Education Level</label>
                <select
                  className="input"
                  value={filters.education || ''}
                  onChange={(e) =>
                    handleFilterChange('education', e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">All</option>
                  <option value="1">High School</option>
                  <option value="2">Graduate</option>
                  <option value="3">Postgraduate</option>
                  <option value="4">Master/Doctor</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ page: 1, page_size: 15, sort_by: 'absenteeism_hours', sort_order: 'desc' })}
                  className="btn-secondary"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 font-medium text-gray-600">
                    Employee
                  </th>
                  <th
                    className="text-left p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('age')}
                  >
                    <div className="flex items-center gap-1">
                      Age
                      <ArrowUpDown size={14} />
                    </div>
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    Reason
                  </th>
                  <th
                    className="text-left p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('service_time')}
                  >
                    <div className="flex items-center gap-1">
                      Service
                      <ArrowUpDown size={14} />
                    </div>
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    Education
                  </th>
                  <th
                    className="text-left p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('bmi')}
                  >
                    <div className="flex items-center gap-1">
                      BMI
                      <ArrowUpDown size={14} />
                    </div>
                  </th>
                  <th
                    className="text-right p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('absenteeism_hours')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Absence Hours
                      <ArrowUpDown size={14} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : data?.employees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-gray-500">
                      No employees found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  data?.employees.map((employee: Employee, index) => (
                    <tr
                      key={`${employee.id}-${index}`}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <User size={16} className="text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              Employee #{employee.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{employee.age}</td>
                      <td className="p-4">
                        <span className="text-sm text-gray-600">
                          {employee.reason_description.length > 25
                            ? employee.reason_description.slice(0, 25) + '...'
                            : employee.reason_description}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600">
                        {employee.service_time} yrs
                      </td>
                      <td className="p-4 text-gray-600">
                        {['', 'HS', 'Grad', 'PG', 'PhD'][employee.education] || '-'}
                      </td>
                      <td className="p-4 text-gray-600">
                        {employee.bmi.toFixed(1)}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`font-semibold ${getRiskClass(employee.absenteeism_hours)}`}>
                          {employee.absenteeism_hours}h
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                Page {data.page} of {data.total_pages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(data.page - 1)}
                  disabled={data.page <= 1}
                  className="btn-outline p-2 disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => handlePageChange(data.page + 1)}
                  disabled={data.page >= data.total_pages}
                  className="btn-outline p-2 disabled:opacity-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
