import { formatDate } from './dateUtils.js';
import { API_BASE_URL } from './config.js';
// import { error } from 'console';

const today = new Date();
const formattedDate = formatDate(today);

const picker = new Pikaday({
  field: document.getElementById('datepicker'),
  defaultDate: today,
  setDefaultDate: true,
  maxDate: today,
  onSelect: function(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const year = String(date.getFullYear()).slice(-2);
    const selectedDate = `${day}/${month}/${year}`;

    console.log('Date selected:', selectedDate);
    spinner.classList.remove('hidden');
    attendanceDataTable.classList.remove('visible');
    renderAttendanceData(selectedDate);
  }
});

const adminLogInBtn = document.querySelector('.login-btn');
const adminLogInLink = document.querySelector('.logIn-btn-link');

adminLogInBtn.innerHTML = `<span class="loader"></span>`;

async function handleDashboardNav() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      resetToLoginState();
      return;
    }
    const response = await fetch(`${API_BASE_URL}/api/auth/check-admin`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (response.status === 401) {
      resetToLoginState();
      return;
    }
    if (!response.ok) {
      throw new Error(`Admin check failed with status: ${response.status}`);
    }
    const result = await response.json();
    if (result.success) {
      setAdminState();
    } else {
      resetToLoginState();
    }
  } catch (error) {
    console.error('Admin check error:', error);
    showErrorNotification('Failed to verify admin status');
    resetToLoginState();
  }
}

function resetToLoginState() {
  localStorage.removeItem('token');
  adminLogInBtn.innerHTML = `ADMIN LOGIN`;
  adminLogInLink.href = "./login/admin_login.html";
}

function setAdminState() {
  adminLogInBtn.innerHTML = `ADMIN DASHBOARD`;
  adminLogInLink.href = "./dashboard/dashboard.html";
}

const attendanceDataTable = document.querySelector(".table-container");
const spinner = document.querySelector('.spinner');

const renderAttendanceData = async (selectedDate) => {
  console.log('renderAttendanceData called with date:', selectedDate);
  console.log('Table element exists:', !!document.querySelector('#data-table tbody'));

  attendanceDataTable.classList.remove("visible");

  if (selectedDate) {
    const dateParts = selectedDate.split("/");
    const isoDate = `20${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

    console.log("iso date:", isoDate)

    const tableBody = document.querySelector("#data-table tbody");
    tableBody.innerHTML = "";

    try {
      const usersResponse = await fetch(`${API_BASE_URL}/api/users`);
      const usersData = await usersResponse.json();

      if (!usersData.success || !Array.isArray(usersData.users)) {
        console.error("Invalid users data:", usersData);
        return;
      }

      const attendanceResponse = await fetch(
        `${API_BASE_URL}/api/attendance?date=${isoDate}`
      );

      const attendanceData = await attendanceResponse.json();

      if (
        !attendanceData.success ||
        !Array.isArray(attendanceData.attendance)
      ) {
        console.error("Invalid attendance data:", attendanceData);
        return;
      }

      const attendanceMap = {};
      attendanceData.attendance.forEach((record) => {
        attendanceMap[record.userId] = record.status;
      });

      usersData.users.forEach((user) => {
        const row = document.createElement("tr");
        const attendanceStatus = attendanceMap[user.id] || "Not Marked";

        let statusClass = "";
        if (attendanceStatus === "Present") {
          statusClass = "status-present";
        } else if (attendanceStatus === "Absent") {
          statusClass = "status-absent";
        } else {
          statusClass = "status-not-marked";
        }

        row.innerHTML = `
        <td>${user.name}</td>
        <td>${user.program}</td>
        <td class="${statusClass}">${attendanceStatus}</td>
      `;
        tableBody.appendChild(row);
      });

      const existingMsg = attendanceDataTable.querySelector('.no-data-msg');
      if (existingMsg) existingMsg.remove();
      
      if (usersData.users.length === 0) {
        
        const noDataMsg = document.createElement("div");
        noDataMsg.setAttribute("class", "no-data-msg");
        noDataMsg.textContent = "No data";
        attendanceDataTable.appendChild(noDataMsg);
      }

      attendanceDataTable.classList.add("visible");
      setTimeout(() => {
        spinner.classList.add("hidden");
      }, 200);
    } catch (error) {
      console.error("Error rendering users:", error);
    }
  }
};

document.getElementById("refresh").addEventListener("click", () => {
  const currentDate = picker.getDate();
  const formattedDate = currentDate ? [
    String(currentDate.getDate()).padStart(2, '0'),
    String(currentDate.getMonth() + 1).padStart(2, '0'),
    String(currentDate.getFullYear()).slice(-2)
  ].join('/') : formatDate(new Date());
  attendanceDataTable.classList.remove("visible");
  spinner.classList.remove("hidden");
  renderAttendanceData(formattedDate);
});

window.addEventListener('load', () => {
  handleDashboardNav();
  renderAttendanceData(formattedDate);
});