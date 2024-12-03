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
            notes: ''
        },
        tasks: [],
        daysOfWeek: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
        picker: null,
        currentField: null
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
                notes: ''
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
            if (confirm('Are you sure you want to delete this task?')) {
                const findAndDeleteTask = (tasks, taskId) => {
                    for (let i = 0; i < tasks.length; i++) {
                        const task = tasks[i];
                        if (task.id === taskId) {
                            tasks.splice(i, 1);
                            return true;
                        } else if (task.subtasks && task.subtasks.length > 0) {
                            const found = findAndDeleteTask(task.subtasks, taskId);
                            if (found) {
                                // Recalculate parent time estimate
                                this.calculateParentTimeEstimate(task);
                                return true;
                            }
                        }
                    }
                    return false;
                };

                findAndDeleteTask(this.tasks, taskId);
                this.saveTasks();
            }
        },
        calculateParentTimeEstimate(task) {
            if (task.subtasks && task.subtasks.length > 0) {
                let total = 0;
                task.subtasks.forEach(sub => {
                    if (sub.timeEstimate !== null) {
                        total += sub.timeEstimate;
                    }
                });
                const hasSubtasksWithEstimates = task.subtasks.some(sub => sub.timeEstimate !== null);
                if (hasSubtasksWithEstimates) {
                    task.timeEstimate = total;
                }
            }
        },
        formatDateBanner(dateStr) {
            const date = new Date(dateStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const diff = Math.floor((date - today) / (1000 * 60 * 60 * 24));

            if (date.getTime() === today.getTime()) return 'Today';
            if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

            if (diff < 7) {
                return date.toLocaleDateString('en-US', { weekday: 'long' });
            }

            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
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
        }
    },

    beforeDestroy() {
        if (this.picker) {
            this.picker.destroy();
            this.picker = null;
        }
    },
    mounted() {
        this.loadTasks();
    }
});