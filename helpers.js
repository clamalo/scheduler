// helpers.js

// Example helper function (ensure accuracy in date calculations)
function getNextDayOfWeek(dayName) {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const today = new Date();
    const targetIndex = days.indexOf(dayName);
    if (targetIndex === -1) return null;
    const currentDayIndex = today.getDay();
    const daysUntilTarget = (targetIndex + 7 - currentDayIndex) % 7 || 7;
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + daysUntilTarget);
    return `${nextDay.getMonth()+1}/${nextDay.getDate()}/${nextDay.getFullYear()}`;
}

function formatNumericDate(input) {
    const parts = input.split('/');
    if (parts.length !== 3) return input;
    const month = String(parts[0]).padStart(2, '0');
    const day = String(parts[1]).padStart(2, '0');
    const year = parts[2];
    return `${month}/${day}/${year}`;
}

// You may add helper functions here if necessary to identify subtasks
// For example:
function isSubtask(task) {
    return task.isSubtask === true;
}