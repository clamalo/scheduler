// components/task-item.js

// Register Vue.Draggable as a global component
Vue.component('draggable', vuedraggable);

// Define the TaskItem component
Vue.component('task-item', {
    template: `
        <div class="task" :class="{ 'completed': task.completed, 'completing': isCompleting }">
            <!-- Display Mode -->
            <div v-if="!isEditing">
                <div class="task-header">
                    <div class="task-header-left">
                        <div v-if="parentName" class="parent-info">
                            <i class="fas fa-level-up-alt fa-rotate-90"></i> {{ parentName }}
                        </div>
                        <!-- Change from v-model to @change -->
                        <input type="checkbox" :checked="task.completed" @change="handleCompletion">
                        <span :class="{ completed: task.completed }">{{ task.name }}</span>
                    </div>
                    <div class="action-buttons">
                        <button class="edit-btn" @click="toggleEditMode" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="add-subtask-btn" @click="toggleAddSubtask" title="Add Subtask">
                            <i class="fas" :class="showAddSubtask ? 'fa-times' : 'fa-plus'"></i>
                        </button>
                        <button class="delete-btn" @click="deleteTask" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="task-details">
                    <div><strong>Time:</strong> {{ task.timeEstimate !== null ? task.timeEstimate + ' hours' : 'N/A' }}</div>
                    <div v-if="task.day"><strong>Day:</strong> {{ task.day }}</div>
                    <div v-if="task.workOnDate"><strong>Work On:</strong> {{ formatDate(task.workOnDate, 'workOn') }}</div>
                    <div v-else><strong>Work On:</strong> N/A</div>
                    <div><strong>Completion Date:</strong> {{ task.completionDate ? formatDate(task.completionDate, 'completion') : 'N/A' }}</div>
                    <!-- Add this new progress div -->
                    <div v-if="task.subtasks && task.subtasks.length">
                        <strong>Subtasks Progress:</strong> 
                        {{ task.subtasks.filter(s => s.completed).length }} of {{ task.subtasks.length }} completed
                        <template v-if="totalSubtaskTime > 0">
                            ({{ Math.round((completedSubtaskTime / totalSubtaskTime) * 100) }}% estimated time)
                        </template>
                    </div>
                    <div v-if="task.notes" class="notes"><strong>Notes:</strong> {{ task.notes }}</div>
                </div>

                <!-- Add Subtask Form -->
                <div v-if="showAddSubtask" class="add-subtask">
                    <h4>Add Subtask</h4>
                    <div class="form-group">
                        <label for="subtaskName">Subtask Name:</label>
                        <input v-model="subtask.name" type="text" placeholder="Enter subtask name" />
                    </div>
                    <div class="form-group">
                        <label for="subTimeEstimate">Time Estimate (hours):</label>
                        <input v-model.number="subtask.timeEstimate" type="number" placeholder="e.g., 2" min="0" />
                        <div class="helper-text">Leave blank for N/A.</div>
                    </div>
                    <div class="form-group">
                        <label for="subWorkOn">Work On:</label>
                        <div class="date-input-container">
                            <input 
                                type="text"
                                v-model="subtask.workOnInput"
                                @input="handleDynamicDateInput($event, 'workOn')"
                                placeholder="Enter date (MM/DD/YYYY) or day (e.g., tue)" 
                                ref="subWorkOnInput"
                            />
                            <button class="date-button today" @click="setToday('workOn')" title="Set to today">
                                <i class="fas fa-calendar-day"></i>
                            </button>
                            <button class="date-button" @click="showCalendar($event, 'workOn')" title="Choose from calendar">
                                <i class="fas fa-calendar-alt"></i>
                            </button>
                        </div>
                        <div class="helper-text">Enter a date (MM/DD/YYYY) or day abbreviation (e.g., tue). Leave blank for N/A.</div>
                    </div>
                    <div class="form-group">
                        <label for="subCompletionDate">Completion Date:</label>
                        <div class="date-input-container">
                            <input 
                                type="text"
                                v-model="subtask.completionInput"
                                @input="handleDynamicDateInput($event, 'completion')"
                                placeholder="Enter date (MM/DD/YYYY) or day (e.g., thu)" 
                                ref="subCompletionInput"
                            />
                            <button class="date-button today" @click="setToday('completion')" title="Set to today">
                                <i class="fas fa-calendar-day"></i>
                            </button>
                            <button class="date-button" @click="showCalendar($event, 'completion')" title="Choose from calendar">
                                <i class="fas fa-calendar-alt"></i>
                            </button>
                        </div>
                        <div class="helper-text">Enter a date (MM/DD/YYYY) or day abbreviation (e.g., thu).</div>
                    </div>
                    <div class="form-group">
                        <label for="subtaskNotes">Notes:</label>
                        <textarea 
                            v-model="subtask.notes" 
                            placeholder="Enter any notes about the subtask..." 
                            rows="3"
                        ></textarea>
                    </div>
                    <button @click="addSubtask">
                        <i class="fas fa-plus"></i> Add Subtask
                    </button>
                </div>

                <!-- Subtasks Section -->
                <div v-if="task.subtasks && task.subtasks.length" class="subtasks-section">
                    <!-- Collapse Button -->
                    <button 
                        class="collapse-btn"
                        @click="toggleSubtasks"
                    >
                        <i class="fas" :class="isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
                        {{ isCollapsed ? 'Show' : 'Hide' }} Subtasks ({{ task.subtasks.length }})
                    </button>
                    
                    <!-- Subtasks List -->
                    <div v-show="!isCollapsed" style="margin-top:10px;">
                        <draggable 
                            v-model="task.subtasks" 
                            :options="{ animation: 200 }" 
                            @end="onDragEnd"
                        >
                            <task-item 
                                v-for="sub in task.subtasks" 
                                :key="sub.id" 
                                :task="sub" 
                                :is-subtask="true"
                                @update-tasks="updateParentTimeEstimate"
                                @update-task="$emit('update-task', $event)"
                                @delete-subtask="deleteSubtask">
                            </task-item>
                        </draggable>
                    </div>
                </div>
            </div>

            <!-- Edit Mode -->
            <div v-else class="edit-mode">
                <div class="form-group">
                    <label for="editTaskName">Task Name:</label>
                    <input v-model="editTask.name" type="text" placeholder="Enter task name" />
                </div>
                <div class="form-group">
                    <label for="editTimeEstimate">Time Estimate (hours):</label>
                    <input v-model.number="editTask.timeEstimate" type="number" placeholder="e.g., 3" min="0" />
                    <div class="helper-text">Leave blank for N/A.</div>
                </div>
                <div class="form-group">
                    <label for="editWorkOn">Work On:</label>
                    <div class="date-input-container">
                        <input 
                            type="text"
                            v-model="editTask.workOnInput"
                            @input="handleDynamicDateInput($event, 'workOn')"
                            placeholder="Enter date (MM/DD/YYYY) or day (e.g., tue)" 
                            ref="workOnInput"
                        />
                        <button class="date-button today" @click="setToday('workOn')" title="Set to today">
                            <i class="fas fa-calendar-day"></i>
                        </button>
                        <button class="date-button" @click="showCalendar($event, 'workOn')" title="Choose from calendar">
                            <i class="fas fa-calendar-alt"></i>
                        </button>
                    </div>
                    <div class="helper-text">Enter a date (MM/DD/YYYY) or day abbreviation (e.g., tue). Leave blank for N/A.</div>
                </div>
                <div class="form-group">
                    <label for="editCompletionDate">Completion Date:</label>
                    <div class="date-input-container">
                        <input 
                            type="text"
                            v-model="editTask.completionInput"
                            @input="handleDynamicDateInput($event, 'completion')"
                            placeholder="Enter date (MM/DD/YYYY) or day (e.g., thu)" 
                            ref="completionInput"
                        />
                        <button class="date-button today" @click="setToday('completion')" title="Set to today">
                            <i class="fas fa-calendar-day"></i>
                        </button>
                        <button class="date-button" @click="showCalendar($event, 'completion')" title="Choose from calendar">
                            <i class="fas fa-calendar-alt"></i>
                        </button>
                    </div>
                    <div class="helper-text">Enter a date (MM/DD/YYYY) or day abbreviation (e.g., thu).</div>
                </div>
                <div class="form-group">
                    <label for="editTaskNotes">Notes:</label>
                    <textarea 
                        v-model="editTask.notes" 
                        placeholder="Enter any notes about the task..." 
                        rows="4"
                    ></textarea>
                </div>
                <div class="edit-buttons">
                    <button class="save-btn" @click="saveEdits" title="Save">
                        <i class="fas fa-save"></i>
                    </button>
                    <button class="cancel-btn" @click="cancelEdit" title="Cancel">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    `,
    props: {
        task: Object,
        isSubtask: Boolean,
        parentName: String
    },
    data() {
        return {
            showAddSubtask: false,
            isEditing: false,
            isCollapsed: true,  // Add this line
            isCompleting: false,
            editTask: {
                name: '',
                timeEstimate: null,
                workOnInput: '',
                workOnDate: '',
                completionInput: '',
                completionDate: '',
                notes: ''
            },
            subtask: {
                name: '',
                timeEstimate: null,
                workOnInput: '',
                workOnDate: '',
                completionInput: '',
                completionDate: '',
                notes: ''
            },
            picker: null,
            currentField: null,
            currentInput: null
        }
    },
    watch: {
        'subtask.workOnInput': function(newVal) {
            this.parseSubtaskDateInput(newVal, 'workOn');
        },
        'subtask.completionInput': function(newVal) {
            this.parseSubtaskDateInput(newVal, 'completion');
        },
        'editTask.workOnInput': function(newVal) {
            this.parseEditDateInput(newVal, 'workOn');
        },
        'editTask.completionInput': function(newVal) {
            this.parseEditDateInput(newVal, 'completion');
        }
    },
    computed: {
        totalSubtaskTime() {
            return this.task.subtasks.reduce((total, sub) => 
                total + (sub.timeEstimate || 0), 0);
        },
        completedSubtaskTime() {
            return this.task.subtasks.reduce((total, sub) => 
                total + (sub.completed ? (sub.timeEstimate || 0) : 0), 0);
        }
    },
    methods: {
        toggleAddSubtask() {
            this.showAddSubtask = !this.showAddSubtask;
        },
        addSubtask() {
            if (this.subtask.name.trim() === '') {
                alert('Subtask name cannot be empty.');
                return;
            }
            if (this.subtask.timeEstimate !== null && this.subtask.timeEstimate < 0) {
                alert('Time estimate cannot be negative.');
                return;
            }
            // Notes can be optional

            const newSubtask = {
                id: Date.now() + Math.random(), // Ensure uniqueness
                name: this.subtask.name,
                timeEstimate: this.subtask.timeEstimate,
                day: this.subtask.workOnDate && this.subtask.workOnDate !== 'N/A' ? (this.subtask.workOnDate.includes('/') ? null : this.subtask.workOnInput) : null,
                workOnDate: this.subtask.workOnDate && this.subtask.workOnDate !== 'N/A' ? this.subtask.workOnDate : null,
                completionDate: this.subtask.completionDate,
                completed: false,
                notes: this.subtask.notes,
                subtasks: []
            };
            this.task.subtasks.push(newSubtask);
            this.calculateParentTimeEstimate();
            // Reset subtask form
            this.subtask = {
                name: '',
                timeEstimate: null,
                workOnInput: '',
                workOnDate: '',
                completionInput: '',
                completionDate: '',
                notes: ''
            };
            this.showAddSubtask = false;
            this.$emit('update-tasks');
        },
        // Update the handleCompletion method to handle animations before updating the task status
        handleCompletion(event) {
            const isChecked = event.target.checked;
            if (isChecked) {
                // Start completion animation
                this.isCompleting = true;
                this.$el.classList.add('moving-to-completed');

                // Wait for the animation to complete before setting the task as completed
                setTimeout(() => {
                    this.task.completed = true;
                    this.isCompleting = false;
                    this.$el.classList.remove('moving-to-completed');
                    this.updateSubtasksAndSave();
                }, 1100); // Total animation duration (500ms + 600ms)
            } else {
                // If unchecking, update immediately without animation
                this.task.completed = false;
                this.updateSubtasksAndSave();
            }
        },

        updateSubtasksAndSave() {
            // Update original task reference if in work view
            if (this.task.taskRef) {
                this.task.taskRef.completed = this.task.completed;
                if (this.task.subtasks && this.task.subtasks.length > 0) {
                    this.task.taskRef.subtasks = this.task.subtasks;
                }
            }

            // Update subtasks
            if (this.task.subtasks && this.task.subtasks.length > 0) {
                this.task.subtasks.forEach(subtask => {
                    subtask.completed = this.task.completed;
                    if (subtask.taskRef) {
                        subtask.taskRef.completed = subtask.completed;
                    }
                });
            }
            
            this.calculateParentTimeEstimate();
            this.$emit('update-tasks');
        },

        deleteTask() {
            this.$emit('delete-task', this.task.id);
        },
        formatDate(dateStr, type) { // Modified method signature
            if (!dateStr) return 'N/A';
            const date = new Date(dateStr);
            const options = { weekday: 'long', month: 'short', day: 'numeric' };
            const formatted = date.toLocaleDateString('en-US', options);
            
            // Only add days remaining for completion dates
            if (type === 'completion') { // Modified condition
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const daysLeft = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
                
                if (daysLeft === 0) return `${formatted} (Due today)`;
                if (daysLeft < 0) return `${formatted} (${Math.abs(daysLeft)} days overdue)`;
                return `${formatted} (${daysLeft} days left)`;
            }
            
            return formatted;
        },
        updateParentTimeEstimate() {
            this.calculateParentTimeEstimate();
            this.$emit('update-tasks');
        },
        calculateParentTimeEstimate() {
            if (this.task.subtasks && this.task.subtasks.length > 0) {
                let total = 0;
                this.task.subtasks.forEach(sub => {
                    if (sub.timeEstimate !== null) {
                        total += sub.timeEstimate;
                    }
                });
                // If there are subtasks with time estimates, set parent task's timeEstimate to the total
                const hasSubtasksWithEstimates = this.task.subtasks.some(sub => sub.timeEstimate !== null);
                if (hasSubtasksWithEstimates) {
                    this.task.timeEstimate = total;
                }
                // If no subtasks have estimates, do not change the parent task's timeEstimate
            }
        },
        onDragEnd() {
            this.calculateParentTimeEstimate();
            this.$emit('update-tasks');
        },
        parseSubtaskDateInput(input, type) {
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
                        this.subtask.workOnDate = nextDate;
                        this.subtask.workOnInput = nextDate;
                    } else {
                        this.subtask.completionDate = nextDate;
                        this.subtask.completionInput = nextDate;
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
                        this.subtask.workOnDate = nextDate;
                        this.subtask.workOnInput = nextDate;
                    } else {
                        this.subtask.completionDate = nextDate;
                        this.subtask.completionInput = nextDate;
                    }
                }
            } else if (/^\d/.test(input)) { // Input starts with a digit
                const formattedDate = formatNumericDate(input);
                if (type === 'workOn') {
                    this.subtask.workOnDate = formattedDate;
                    this.subtask.workOnInput = formattedDate;
                } else {
                    this.subtask.completionDate = formattedDate;
                    this.subtask.completionInput = formattedDate;
                }
            }
        },
        // Edit Mode Methods
        toggleEditMode() {
            this.isEditing = true;
            // Initialize editTask with current task data
            this.editTask = {
                name: this.task.name,
                timeEstimate: this.task.timeEstimate,
                workOnInput: this.task.workOnDate || '',
                workOnDate: this.task.workOnDate || '',
                completionInput: this.task.completionDate || '',
                completionDate: this.task.completionDate || '',
                notes: this.task.notes
            };
        },
        saveEdits() {
            if (this.editTask.name.trim() === '') {
                alert('Task name cannot be empty.');
                return;
            }
            if (this.editTask.timeEstimate !== null && this.editTask.timeEstimate < 0) {
                alert('Time estimate cannot be negative.');
                return;
            }
            
            // Create updated task object
            const updatedTask = {
                ...this.task,
                name: this.editTask.name,
                timeEstimate: this.editTask.timeEstimate,
                workOnDate: this.editTask.workOnInput.trim() === '' ? null : this.editTask.workOnDate,
                completionDate: this.editTask.completionInput.trim() === '' ? null : this.editTask.completionDate,
                notes: this.editTask.notes
            };

            // If this task has a reference (in work view), update both the task and its reference
            if (this.task.taskRef) {
                Object.assign(this.task.taskRef, {
                    name: updatedTask.name,
                    timeEstimate: updatedTask.timeEstimate,
                    workOnDate: updatedTask.workOnDate,
                    completionDate: updatedTask.completionDate,
                    notes: updatedTask.notes
                });
                Object.assign(this.task, updatedTask);
            }

            // If this is a subtask, update in parent's subtasks array
            if (this.isSubtask) {
                const taskEvent = {
                    taskData: updatedTask,
                    isSubtask: true
                };
                this.$emit('update-task', taskEvent);
            } else {
                this.$emit('update-task', { taskData: updatedTask, isSubtask: false });
            }

            // Recalculate parent time estimate if necessary
            this.calculateParentTimeEstimate();
            this.isEditing = false;
            this.$emit('update-tasks');
        },
        cancelEdit() {
            this.isEditing = false;
        },
        parseEditDateInput(input, type) {
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
                        this.editTask.workOnDate = nextDate;
                        this.editTask.workOnInput = nextDate;
                    } else {
                        this.editTask.completionDate = nextDate;
                        this.editTask.completionInput = nextDate;
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
                        this.editTask.workOnDate = nextDate;
                        this.editTask.workOnInput = nextDate;
                    } else {
                        this.editTask.completionDate = nextDate;
                        this.editTask.completionInput = nextDate;
                    }
                }
            } else if (/^\d/.test(input)) { // Input starts with a digit
                const formattedDate = formatNumericDate(input);
                if (type === 'workOn') {
                    this.editTask.workOnDate = formattedDate;
                    this.editTask.workOnInput = formattedDate;
                } else {
                    this.editTask.completionDate = formattedDate;
                    this.editTask.completionInput = formattedDate;
                }
            }
        },
        deleteSubtask(subtaskId) {
            this.task.subtasks = this.task.subtasks.filter(sub => sub.id !== subtaskId);
            this.calculateParentTimeEstimate();
            this.$emit('update-tasks');
        },
        // Add this new method
        toggleSubtasks() {
            this.isCollapsed = !this.isCollapsed;
        },
        setToday(field) {
            const today = new Date();
            const formatted = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
            
            if (this.isEditing) {
                if (field === 'workOn') {
                    this.editTask.workOnInput = formatted;
                    this.editTask.workOnDate = formatted;
                } else {
                    this.editTask.completionInput = formatted;
                    this.editTask.completionDate = formatted;
                }
            } else {
                if (field === 'workOn') {
                    this.subtask.workOnInput = formatted;
                    this.subtask.workOnDate = formatted;
                } else {
                    this.subtask.completionInput = formatted;
                    this.subtask.completionDate = formatted;
                }
            }
        },

        showCalendar(event, field) {
            event.preventDefault(); // Prevent any default button behavior
            
            const button = event.currentTarget;
            const input = this.isEditing ? 
                (field === 'workOn' ? this.$refs.workOnInput : this.$refs.completionInput) :
                (field === 'workOn' ? this.$refs.subWorkOnInput : this.$refs.subCompletionInput);

            // Always destroy existing picker before creating a new one
            if (this.picker) {
                this.picker.destroy();
                this.picker = null;
            }

            // Create new picker
            this.picker = new Pikaday({
                field: input,
                format: 'MM/DD/YYYY',
                onSelect: (date) => {
                    const formatted = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
                    if (this.isEditing) {
                        if (field === 'workOn') {
                            this.editTask.workOnInput = formatted;
                            this.editTask.workOnDate = formatted;
                        } else {
                            this.editTask.completionInput = formatted;
                            this.editTask.completionDate = formatted;
                        }
                    } else {
                        if (field === 'workOn') {
                            this.subtask.workOnInput = formatted;
                            this.subtask.workOnDate = formatted;
                        } else {
                            this.subtask.completionInput = formatted;
                            this.subtask.completionDate = formatted;
                        }
                    }
                    // Hide picker after selection
                    this.picker.hide();
                }
            });
            
            this.currentField = field;
            this.currentInput = input;
            
            // Show and position the picker
            this.picker.show();
            
            // Position the calendar below the button
            const buttonRect = button.getBoundingClientRect();
            const calendar = document.querySelector('.pika-single');
            calendar.style.position = 'fixed';
            calendar.style.left = `${buttonRect.left}px`;
            calendar.style.top = `${buttonRect.bottom + 5}px`;
        },
    },
    created() {
        // Listen for delete-subtask events from child components
        this.$on('delete-subtask', this.deleteSubtask);
    },
    beforeDestroy() {
        if (this.picker) {
            this.picker.destroy();
            this.picker = null;
        }
    }
});