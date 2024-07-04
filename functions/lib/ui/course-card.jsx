import { assert } from "lib/utils/validation";
import jsx from "lib/utils/jsx";

export function CourseCard({ course }) {
  const tag = "CourseCard";
  assert(tag, course && typeof course === "object", "'course' must be an object", { course });
  assert(tag, typeof course.slug === "string", "'course.slug' must be a string", { course });
  assert(tag, typeof course.cover_url === "string", "'course.cover_url' must be a string", { course });
  assert(tag, typeof course.title === "string", "'course.title' must be a string", { course });
  assert(tag, typeof course.overview === "string", "'course.overview' must be a string", { course });
  assert(
    tag,
    [undefined, null].includes(course.total_lessons) || typeof course.total_lessons === "number",
    "course.total_lessons must be a number or undefined",
    { course }
  );
  assert(
    tag,
    [undefined, null].includes(course.total_assignments) || typeof course.total_assignments === "number",
    "course.total_assignments must be a number or undefined",
    { course }
  );
  assert(
    tag,
    [undefined, null].includes(course.certificate_slug) || typeof course.certificate_slug === "string",
    "course.certificate_slug must be a string or undefined",
    { course }
  );
  assert(
    tag,
    [undefined, null].includes(course.enrolled_at) || typeof course.enrolled_at === "number",
    "course.enrolled_at must be a number (UNIX timestamp) or undefined",
    { course }
  );

  const badgeText = course.certificate_slug ? "Completed" : course.enrolled_at ? "Enrolled" : "";

  return (
    <a href={`/course/${course.slug}`} className="course-card">
      <img src={course.cover_url} height="180" width="320" alt={course.title} />
      <section>
        <h2>{course.title}</h2>
        <p>{course.overview}</p>
        <ul>
          {course.total_lessons && (
            <li title={`${truncateCount(course.total_lessons)} lessons`}>
              <img
                className="icon"
                src="/img/icons/presentation-chart-line.svg"
                alt="Lessons"
                height="18"
                width="18"
              />
              <span>{truncateCount(course.total_lessons)} Lessons</span>
            </li>
          )}
          {course.total_assignments && (
            <li title={`${truncateCount(course.total_assignments)} assignment(s)`}>
              <img
                className="icon"
                src="/img/icons/clipboard-document-list.svg"
                alt="Assignments"
                height="16"
                width="16"
              />
              <span>{truncateCount(course.total_assignments)} Assignments</span>
            </li>
          )}
          {badgeText && (
            <li>
              <span className="badge">{badgeText}</span>
            </li>
          )}
        </ul>
      </section>
    </a>
  );
}

export const truncateCount = (num) => {
  const convertedNum = Number(num);
  return Math.abs(convertedNum) > 999
    ? Math.sign(convertedNum) * parseFloat((Math.abs(convertedNum) / 1000).toFixed(1)) + "k"
    : convertedNum;
};
