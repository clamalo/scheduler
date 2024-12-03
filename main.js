// main.js

// Main Vue Instance
new Vue({
    el: '#app',
    data: {
        showModal: false,  // Control Add Task Modal visibility
        currentView: 'project',
        newTask: {
            name: '',
            timeEstimate: null,
            workOnInput: '',
            workOnDate: '',
            completionInput: '',
            completionDate: '',
            notes: '',
            timeUnit: 'hours', // Add this line
        },
        tasks: [],
        daysOfWeek: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
        picker: null,
        currentField: null,
        showNotification: false,
        notificationMessage: '',
        deletedTask: null,
        undoTimer: null,
        undoDuration: 5000, // Duration for undo in milliseconds
        timeLeft: 5, // Time left in seconds
        hideNotificationTimer: null, // Add this line
        deletedSubtask: null, // Add this line to store deleted subtask
    },
    computed: {
        activeTasks() {
            return this.tasks.filter(task => !task.completed);
        },
        completedTasks() {
            return this.tasks.filter(task => task.completed);
        },
        workViewItems() {
            const items = [];

            const processTask = (task) => {
                // Include subtasks first
                if (task.subtasks && task.subtasks.length > 0) {
                    task.subtasks.forEach(sub => {
                        if (!sub.completed) {  // Only add uncompleted subtasks
                            items.push({
                                task: sub,
                                parentTask: task,
                                isSubtask: true,
                                parentName: task.name,
                                effectiveDate: sub.workOnDate || sub.completionDate,
                            });
                        }
                    });
                }

                // Include the main task if not completed
                if (!task.completed) {
                    const effectiveDate = task.workOnDate || task.completionDate;
                    items.push({
                        task: task,
                        parentTask: null,
                        isSubtask: false,
                        parentName: null,
                        effectiveDate: effectiveDate,
                    });
                }
            };

            this.tasks.forEach(task => processTask(task));
            return items;
        },

        workViewCompletedTasks() {
            const items = [];
            const processTask = (task) => {
                // Include completed subtasks
                if (task.subtasks && task.subtasks.length > 0) {
                    task.subtasks.forEach(sub => {
                        if (sub.completed) {
                            items.push({
                                task: sub,
                                parentTask: task,
                                isSubtask: true,
                                parentName: task.name,
                                effectiveDate: sub.workOnDate || sub.completionDate,
                            });
                        }
                    });
                }

                // Include completed main tasks
                if (task.completed) {
                    const effectiveDate = task.workOnDate || task.completionDate;
                    items.push({
                        task: task,
                        parentTask: null,
                        isSubtask: false,
                        parentName: null,
                        effectiveDate: effectiveDate,
                    });
                }
            };

            this.tasks.forEach(task => processTask(task));
            return items;
        },

        workViewNoDate() {
            return this.workViewItems.filter(item => !item.effectiveDate);
        },

        workViewGroups() {
            const groups = {};
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            this.workViewItems
                .filter(item => item.effectiveDate)
                .forEach(item => {
                    if (!groups[item.effectiveDate]) {
                        groups[item.effectiveDate] = [];
                    }
                    groups[item.effectiveDate].push(item);
                });

            // Sort dates
            return Object.keys(groups)
                .sort((a, b) => new Date(a) - new Date(b))
                .reduce((obj, key) => {
                    obj[key] = groups[key];
                    return obj;
                }, {});
        },
        
        workViewGroupTimes() {
            const times = {};
            
            // Calculate times for dated groups
            for (const [date, items] of Object.entries(this.workViewGroups)) {
                let totalMinutes = 0;
                items.forEach(item => {
                    // Include subtasks
                    if (item.isSubtask && item.task.timeEstimate) {
                        totalMinutes += item.task.timeUnit === 'hours' ? item.task.timeEstimate * 60 : item.task.timeEstimate;
                    }
                    // Include parent tasks only if they have no subtasks
                    else if (!item.isSubtask && (!item.task.subtasks || item.task.subtasks.length === 0) && item.task.timeEstimate) {
                        totalMinutes += item.task.timeUnit === 'hours' ? item.task.timeEstimate * 60 : item.task.timeEstimate;
                    }
                });
                times[date] = totalMinutes;
            }
            
            // Calculate time for no-date items
            let noDateTotal = 0;
            this.workViewNoDate.forEach(item => {
                // Include subtasks
                if (item.isSubtask && item.task.timeEstimate) {
                    noDateTotal += item.task.timeUnit === 'hours' ? item.task.timeEstimate * 60 : item.task.timeEstimate;
                }
                // Include parent tasks only if they have no subtasks
                else if (!item.isSubtask && (!item.task.subtasks || item.task.subtasks.length === 0) && item.task.timeEstimate) {
                    noDateTotal += item.task.timeEstimate * (item.task.timeUnit === 'hours' ? 60 : 1);
                }
            });
            times['noDate'] = noDateTotal;
            
            return times;
        }
    },
    watch: {
        'newTask.workOnInput': function(newVal) {
            this.parseDateInput(newVal, 'workOn');
        },
        'newTask.completionInput': function(newVal) {
            this.parseDateInput(newVal, 'completion');
        },
        tasks: {
            handler(newTasks) {
                this.saveTasks();
            },
            deep: true
        }
    },
    methods: {
        addTask() {
            if (this.newTask.name.trim() === '') {
                alert('Task name cannot be empty.');
                return;
            }
            if (this.newTask.timeEstimate !== null && this.newTask.timeEstimate < 0) {
                alert('Time estimate cannot be negative.');
                return;
            }

            const task = {
                id: Date.now(),
                name: this.newTask.name,
                timeEstimate: this.newTask.timeEstimate,
                timeUnit: this.newTask.timeUnit, // Add this line
                day: this.newTask.workOnDate && this.newTask.workOnDate !== 'N/A' ? (this.newTask.workOnDate.includes('/') ? null : this.newTask.workOnInput) : null,
                workOnDate: this.newTask.workOnDate && this.newTask.workOnDate !== 'N/A' ? this.newTask.workOnDate : null,
                completionDate: this.newTask.completionDate,
                completed: false,
                notes: this.newTask.notes,
                subtasks: []
            };
            this.tasks.push(task);
            // Reset task form
            this.newTask = {
                name: '',
                timeEstimate: null,
                workOnInput: '',
                workOnDate: '',
                completionInput: '',
                completionDate: '',
                notes: '',
                timeUnit: 'hours', // Reset to default
            };
            this.saveTasks();
            // After adding task, close the modal
            this.showModal = false;
        },
        handleDynamicDateInput(event, type) {
            const input = event.target.value.trim();

            if (/^[a-zA-Z]/.test(input)) {
                if (input.length >= 3) {
                    const dayAbbreviation = input.slice(0,3).toLowerCase();
                    const dayMap = {
                        'sun': 'Sunday',
                        'mon': 'Monday',
                        'tue': 'Tuesday',
                        'wed': 'Wednesday',
                        'thu': 'Thursday',
                        'fri': 'Friday',
                        'sat': 'Saturday'
                    };
                    if (dayMap.hasOwnProperty(dayAbbreviation)) {
                        const dayName = dayMap[dayAbbreviation];
                        const nextDate = getNextDayOfWeek(dayName);
                        if (type === 'workOn') {
                            this.newTask.workOnDate = nextDate;
                            this.newTask.workOnInput = nextDate;
                        } else {
                            this.newTask.completionDate = nextDate;
                            this.newTask.completionInput = nextDate;
                        }
                        return;
                    }
                }
            } else if (/^\d/.test(input)) { // Input starts with a digit
                const formattedDate = formatNumericDate(input);
                if (type === 'workOn') {
                    this.newTask.workOnDate = formattedDate;
                    this.newTask.workOnInput = formattedDate;
                } else {
                    this.newTask.completionDate = formattedDate;
                    this.newTask.completionInput = formattedDate;
                }
            }
        },
        saveTasks() {
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
        },
        loadTasks() {
            const savedTasks = localStorage.getItem('tasks');
            if (savedTasks) {
                this.tasks = JSON.parse(savedTasks);
            }
        },
        clearCompletedTasks() {
            if (confirm('Are you sure you want to permanently delete all completed tasks?')) {
                this.tasks = this.tasks.filter(task => !task.completed);
                this.saveTasks();
            }
        },
        parseDateInput(input, type) {
            input = input.trim().toLowerCase();

            if (/^[a-z]{3}$/.test(input)) { // Expecting a 3-letter abbreviation
                const dayMap = {
                    'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3,
                    'thu': 4, 'fri': 5, 'sat': 6
                };
                if (dayMap.hasOwnProperty(input)) {
                    const dayName = Object.keys(dayMap).find(key => key === input);
                    const nextDate = getNextDayOfWeek(dayName.charAt(0).toUpperCase() + dayName.slice(1));
                    if (type === 'workOn') {
                        this.newTask.workOnDate = nextDate;
                        this.newTask.workOnInput = nextDate;
                    } else {
                        this.newTask.completionDate = nextDate;
                        this.newTask.completionInput = nextDate;
                    }
                }
            } else if (/^[a-z]/.test(input) && input.length >=3) { // Partial match with letters
                const dayMap = {
                    'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3,
                    'thu': 4, 'fri': 5, 'sat': 6
                };
                const dayAbbreviation = input.slice(0,3);
                if (dayMap.hasOwnProperty(dayAbbreviation)) {
                    const dayName = Object.keys(dayMap).find(key => key === dayAbbreviation);
                    const nextDate = getNextDayOfWeek(dayName.charAt(0).toUpperCase() + dayName.slice(1));
                    if (type === 'workOn') {
                        this.newTask.workOnDate = nextDate;
                        this.newTask.workOnInput = nextDate;
                    } else {
                        this.newTask.completionDate = nextDate;
                        this.newTask.completionInput = nextDate;
                    }
                }
            } else if (/^\d/.test(input)) { // Input starts with a digit
                const formattedDate = formatNumericDate(input);
                if (type === 'workOn') {
                    this.newTask.workOnDate = formattedDate;
                    this.newTask.workOnInput = formattedDate;
                } else {
                    this.newTask.completionDate = formattedDate;
                    this.newTask.completionInput = formattedDate;
                }
            }
        },
        deleteTask(taskId) {
            const index = this.tasks.findIndex(task => task.id === taskId);
            if (index !== -1) {
                // Store the deleted task
                this.deletedTask = this.tasks.splice(index, 1)[0];
                
                // Show notification
                this.notificationMessage = 'Task Deleted';
                this.showNotification = true;
                this.timeLeft = this.undoDuration / 1000; // Initialize to 5 seconds

                // Clear any existing undo timer and hideNotificationTimer
                if (this.undoTimer) {
                    clearInterval(this.undoTimer);
                }
                if (this.hideNotificationTimer) {
                    clearTimeout(this.hideNotificationTimer);
                }

                // Add a class to trigger the slider animation
                this.$nextTick(() => {
                    const notificationElement = document.querySelector('.notification');
                    if (notificationElement) {
                        notificationElement.classList.remove('hide-slider');
                        // Force reflow to restart the animation
                        void notificationElement.offsetWidth;
                        notificationElement.classList.add('hide-slider');
                    }
                });

                // Start undo timer to decrement timeLeft every second immediately
                this.undoTimer = setInterval(() => {
                    this.timeLeft -= 1;
                    if (this.timeLeft <= 0) {
                        clearInterval(this.undoTimer);
                    }
                }, 1000);
                // Immediately decrement timeLeft to start the countdown
                this.timeLeft -= 1;

                // Set a timeout to hide the notification after undoDuration
                this.hideNotificationTimer = setTimeout(() => {
                    this.showNotification = false;
                    this.deletedTask = null;
                    clearInterval(this.undoTimer);
                }, this.undoDuration);
            }
        },

        // Undo the deletion
        undoDelete() {
            if (this.deletedTask) {
                this.tasks.push(this.deletedTask);
                this.deletedTask = null;
            }
            if (this.deletedSubtask) {
                const { taskId, subtask } = this.deletedSubtask;
                const parentTask = this.tasks.find(task => task.id === taskId);
                if (parentTask) {
                    parentTask.subtasks.push(subtask);
                }
                this.deletedSubtask = null;
            }
            this.showNotification = false;
            clearInterval(this.undoTimer);
            clearTimeout(this.hideNotificationTimer);
        },
        calculateParentTimeEstimate(task) {
            if (task.subtasks && task.subtasks.length > 0) {
                let total = 0;
                task.subtasks.forEach(sub => {
                    if (sub.timeEstimate !== null) {
                        total += sub.timeUnit === 'hours' 
                            ? sub.timeEstimate * 60 
                            : sub.timeEstimate;
                    }
                });
                const hasSubtasksWithEstimates = task.subtasks.some(sub => sub.timeEstimate !== null);
                if (hasSubtasksWithEstimates) {
                    // Set parent task's timeEstimate to the sum of subtasks
                    task.timeEstimate = total / 60; // Convert back to hours if needed
                }
            }
            // ...existing code...
        },
        formatTimeEstimate(minutes) {
            if (minutes === 0) return '';
            const hrs = Math.floor(minutes / 60);
            const mins = minutes % 60;
            let result = ' - ';
            if (hrs > 0 && mins > 0) {
                result += `${hrs}hr ${mins}min`;
            } else if (hrs > 0) {
                result += `${hrs}hr`;
            } else {
                result += `${mins}min`;
            }
            result += ' remaining';
            return result;
        },

        formatDateBanner(dateStr) {
            const date = new Date(dateStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const diff = Math.floor((date - today) / (1000 * 60 * 60 * 24));

            let prefix = '';
            if (date.getTime() === today.getTime()) prefix = 'Today';
            else if (date.getTime() === tomorrow.getTime()) prefix = 'Tomorrow';
            else if (diff < 7) prefix = date.toLocaleDateString('en-US', { weekday: 'long' });
            else prefix = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

            // Add time estimate if available
            const timeEst = this.workViewGroupTimes[dateStr];
            return prefix + (timeEst ? this.formatTimeEstimate(timeEst) : '');
        },

        updateTask() {
            this.saveTasks();
        },
        setModalToday(field) {
            const today = new Date();
            const formatted = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;

            if (field === 'workOn') {
                this.newTask.workOnInput = formatted;
                this.newTask.workOnDate = formatted;
            } else {
                this.newTask.completionInput = formatted;
                this.newTask.completionDate = formatted;
            }
        },

        showModalCalendar(event, field) {
            event.preventDefault();

            const button = event.currentTarget;
            const input = field === 'workOn' ? this.$refs.modalWorkOnInput : this.$refs.modalCompletionInput;

            if (this.picker) {
                this.picker.destroy();
                this.picker = null;
            }

            this.picker = new Pikaday({
                field: input,
                format: 'MM/DD/YYYY',
                onSelect: (date) => {
                    const formatted = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
                    if (field === 'workOn') {
                        this.newTask.workOnInput = formatted;
                        this.newTask.workOnDate = formatted;
                    } else {
                        this.newTask.completionInput = formatted;
                        this.newTask.completionDate = formatted;
                    }
                    this.picker.hide();
                }
            });

            this.currentField = field;
            this.picker.show();

            const buttonRect = button.getBoundingClientRect();
            const calendar = document.querySelector('.pika-single');
            calendar.style.position = 'fixed';
            calendar.style.left = `${buttonRect.left}px`;
            calendar.style.top = `${buttonRect.bottom + 5}px`;
        },
        deleteSubtask(taskId, subTaskId) {
            const findAndDeleteSubtask = (tasks) => {
                for (let task of tasks) {
                    if (task.id === taskId) {
                        const subTaskIndex = task.subtasks.findIndex(sub => sub.id === subTaskId);
                        if (subTaskIndex !== -1) {
                            // Store the deleted subtask with its parent task ID
                            this.deletedSubtask = { taskId, subtask: task.subtasks[subTaskIndex] };
                            // Remove the subtask
                            task.subtasks.splice(subTaskIndex, 1);
                            
                            // Show notification
                            this.notificationMessage = 'Subtask Deleted';
                            this.showNotification = true;
                            this.timeLeft = this.undoDuration / 1000;

                            // Clear any existing timers
                            if (this.undoTimer) clearInterval(this.undoTimer);
                            if (this.hideNotificationTimer) clearTimeout(this.hideNotificationTimer);

                            // Add animation class
                            this.$nextTick(() => {
                                const notificationElement = document.querySelector('.notification');
                                if (notificationElement) {
                                    notificationElement.classList.remove('hide-slider');
                                    void notificationElement.offsetWidth;
                                    notificationElement.classList.add('hide-slider');
                                }
                            });

                            // Start countdown
                            this.undoTimer = setInterval(() => {
                                this.timeLeft -= 1;
                                if (this.timeLeft <= 0) {
                                    clearInterval(this.undoTimer);
                                }
                            }, 1000);

                            // Set hide timeout
                            this.hideNotificationTimer = setTimeout(() => {
                                this.showNotification = false;
                                this.deletedSubtask = null;
                                clearInterval(this.undoTimer);
                            }, this.undoDuration);

                            return true;
                        }
                    }
                    // Recursively search through subtasks
                    if (task.subtasks && task.subtasks.length > 0) {
                        if (findAndDeleteSubtask(task.subtasks)) return true;
                    }
                }
                return false;
            };

            findAndDeleteSubtask(this.tasks);
            this.saveTasks();
        },
    },

    beforeDestroy() {
        if (this.picker) {
            this.picker.destroy();
            this.picker = null;
        }
        clearInterval(this.undoTimer);
        clearTimeout(this.hideNotificationTimer); // Clear the hide timeout
    },
    mounted() {
        this.loadTasks();
    }
});