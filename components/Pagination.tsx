import Link from 'next/link';

interface PaginationProps {
  page: number;
  totalPages: number;
  baseUrl: string;
}

export default function Pagination({ page, totalPages, baseUrl }: PaginationProps) {
  if (totalPages <= 1) return null;

  const separator = baseUrl.includes('?') ? '&' : '?';

  return (
    <div className="pagination">
      {page > 1 && (
        <Link href={`${baseUrl}${separator}page=${page - 1}`} className="pagination-link">
          &laquo; prev
        </Link>
      )}
      <span className="pagination-info">page {page} of {totalPages}</span>
      {page < totalPages && (
        <Link href={`${baseUrl}${separator}page=${page + 1}`} className="pagination-link">
          next &raquo;
        </Link>
      )}
    </div>
  );
}
