const ManageCourses = {
  isDragging: false,

  getTableBody: function () {
    const table = document.getElementsByClassName("manage-courses-table")[0];
    const tableBody = table && table.getElementsByTagName("tbody")[0];
    if (!tableBody) {
      console.error("tbody of 'Manage Courses' table not found.");
      alert("ERROR: tbody of 'Manage Courses' table not found.");
    }
    return tableBody;
  },

  enableReorder: function () {
    const tableBody = ManageCourses.getTableBody();
    if (!tableBody) return false;

    const defaultButtons = document.getElementsByClassName("manage-courses-default-buttons")[0];
    defaultButtons.style.display = "none";

    const orderingButtons = document.getElementsByClassName("manage-courses-ordering-buttons")[0];
    orderingButtons.style.display = "flex";

    const tableRows = Array.from(tableBody.getElementsByTagName("tr"));
    tableRows.forEach(ManageCourses.makeDraggable);

    const hiddenInput = document.getElementsByName("sorted_course_ids")[0];
    hiddenInput.value = tableRows
      .map(function (row) {
        return row.dataset.courseId;
      })
      .join(",");
  },

  makeDraggable: function (rowElement) {
    rowElement.draggable = true;
    rowElement.ondragstart = ManageCourses.handleDragStart;
    rowElement.ondragover = ManageCourses.handleDragOver;
    rowElement.ondrop = ManageCourses.handleDrop;
    rowElement.ondragend = ManageCourses.handleDragEnd;
  },

  makeNotDraggable: function (rowElement) {
    rowElement.draggable = false;
    rowElement.ondragstart = null;
    rowElement.ondragover = null;
    rowElement.ondrop = null;
    rowElement.ondragend = null;
  },

  handleDragStart: function (event) {
    ManageCourses.isDragging = true;
    event.target.classList.add("manage-courses-dragging-row");
  },

  handleDragOver: function (event) {
    event.preventDefault();
    const draggedOverRow = event.target.closest("tr");
    const tbody = draggedOverRow.parentNode;
    const draggedRow = tbody.querySelector(".manage-courses-dragging-row");
    if (!draggedRow) {
      console.error("Unable to locate dragged row");
      return;
    }

    if (ManageCourses.isDragging && draggedOverRow !== draggedRow) {
      const positionDifference = draggedRow.offsetTop - draggedOverRow.offsetTop;
      if (positionDifference < 0) {
        tbody.insertBefore(draggedRow, draggedOverRow.nextSibling);
      } else {
        tbody.insertBefore(draggedRow, draggedOverRow);
      }

      const tableRows = Array.from(tbody.getElementsByTagName("tr"));
      const hiddenInput = document.getElementsByName("sorted_course_ids")[0];
      hiddenInput.value = tableRows
        .map(function (row) {
          return row.dataset.courseId;
        })
        .join(",");
    }
  },

  handleDrop: function (event) {
    event.preventDefault();
  },

  handleDragEnd: function (event) {
    ManageCourses.isDragging = false;
    event.target.classList.remove("manage-courses-dragging-row");
  },
};
