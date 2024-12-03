// helpers.js

// Helper function to get the next date for a given day of the week
function getNextDayOfWeek(dayOfWeek) {
    const daysOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const today = new Date();
    const currentDay = today.getDay();
    const targetDay = daysOfWeek.indexOf(dayOfWeek);
    let delta = targetDay - currentDay;
    if (delta <= 0) {
        delta += 7;
    }
    const nextDay = new Date();
    nextDay.setDate(today.getDate() + delta);
    const month = String(nextDay.getMonth() + 1).padStart(2, '0');
    const day = String(nextDay.getDate()).padStart(2, '0');
    const year = nextDay.getFullYear();
    return `${month}/${day}/${year}`;
}

// Helper function to format numeric date input
function formatNumericDate(input) {
    // Remove non-digit characters
    const digits = input.replace(/\D/g, '');
    let formatted = '';
    if (digits.length >= 1) {
        formatted += digits.substring(0,1);
    }
    if (digits.length >= 2) {
        formatted += digits.substring(1,2) + '/';
    }
    if (digits.length >= 3) {
        formatted += digits.substring(2,4) + '/';
    }
    if (digits.length >= 5) {
        formatted += digits.substring(4,8);
    }
    return formatted;
}