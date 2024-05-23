import jsx from "lib/utils/jsx";

export function CourseCard({ course }) {
  let badgeText = "";
  if (course.certificate_slug) {
    badgeText = "Completed";
  } else if (course.enrolled_at) {
    badgeText = "Enrolled";
  }

  return (
    <a href={`/course/${course.slug}`} className="ui-course-card">
      <img src={course.cover_url} height="180" width="320" alt={course.title} />
      <header>
        <h2>{course.title}</h2>
        <p>{course.overview}</p>
        <ul className="ui-course-card-stats">
          {course.total_lessons && <li title={`${truncateCount(course.total_lessons)} lessons`}>{truncateCount(course.total_lessons)} Lessons</li>}
          {course.total_assignments && (
            <li title={`${truncateCount(course.total_assignments)} assignment(s)`}>{truncateCount(course.total_assignments)} Assignments</li>
          )}
          {badgeText && (
            <li>
              <span className="ui-badge">{badgeText}</span>
            </li>
          )}
        </ul>
      </header>
    </a>
  );
}

export const truncateCount = (num) => {
  const convertedNum = Number(num);
  return Math.abs(convertedNum) > 999 ? Math.sign(convertedNum) * parseFloat((Math.abs(convertedNum) / 1000).toFixed(1)) + "k" : convertedNum;
};
