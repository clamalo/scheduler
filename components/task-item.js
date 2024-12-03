// components/task-item.js

// Register Vue.Draggable as a global component
Vue.component('draggable', vuedraggable);

// Define the TaskItem component
Vue.component('task-item', {
    template: `
        <div :class="taskClass">
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
                        <!-- Remove v-if="!isSubtask" to allow add subtask button on all tasks -->
                        <button class="add-subtask-btn" @click="toggleAddSubtask" title="Add Subtask">
                            <i class="fas" :class="showAddSubtask ? 'fa-times' : 'fa-plus'"></i>
                        </button>
                        <button class="delete-btn" @click="deleteTask" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="task-details">
                    <div><strong>Time:</strong> {{ task.timeEstimate !== null ? formatTimeEstimate(task.timeEstimate, task.timeUnit || 'hours') : 'N/A' }}</div>
                    <div v-if="task.day"><strong>Day:</strong> {{ task.day }}</div>
                    <div v-if="task.workOnDate"><strong>Work On:</strong> {{ formatDate(task.workOnDate, 'workOn') }}</div>
                    <div v-else><strong>Work On:</strong> N/A</div>
                    <div><strong>Completion Date:</strong> {{ task.completionDate ? formatDate(task.completionDate, 'completion') : 'N/A' }}</div>
                    <!-- Add this new progress div -->
                    <div v-if="task.subtasks && task.subtasks.length">
                        <strong>Subtasks Progress:</strong> 
                        {{ task.subtasks.filter(s => s.completed).length }} of {{ task.subtasks.length }} completed
                        <span v-if="remainingSubtaskTime > 0">({{ formatRemainingTime(remainingSubtaskTime) }} remaining)</span>
                        <span v-else>(All subtasks completed)</span>
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
                        <label for="subTimeEstimate">Time Estimate:</label>
                        <div class="time-estimate-group">
                            <input v-model.number="subtask.timeEstimate" type="number" placeholder="e.g., 2" min="0" />
                            <button 
                                class="unit-toggle" 
                                @click="subtask.timeUnit = subtask.timeUnit === 'hours' ? 'minutes' : 'hours'"
                                type="button"
                            >
                                {{ subtask.timeUnit === 'hours' ? 'hrs' : 'min' }}
                            </button>
                        </div>
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
                                :parent-task="task"
                                :level="level + 1"
                                @update-tasks="updateParentTimeEstimate"
                                @delete-task="deleteSubtask"
                                @delete-subtask="propagateDeleteSubtask">  <!-- Add this line -->
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
                    <label for="editTimeEstimate">Time Estimate:</label>
                    <div class="time-estimate-group">
                        <input v-model.number="editTask.timeEstimate" type="number" placeholder="e.g., 3" min="0" />
                        <button 
                            class="unit-toggle" 
                            @click="editTask.timeUnit = editTask.timeUnit === 'hours' ? 'minutes' : 'hours'"
                            type="button"
                        >
                            {{ editTask.timeUnit === 'hours' ? 'hrs' : 'min' }}
                        </button>
                    </div>
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
        parentName: String,
        parentTask: Object,
        level: {
            type: Number,
            default: 0
        }
    },
    data() {
        return {
            showAddSubtask: false,
            isEditing: false,
            isCollapsed: true,
            isCompleting: false,
            editTask: {
                name: '',
                timeEstimate: null,
                workOnInput: '',
                workOnDate: '',
                completionInput: '',
                completionDate: '',
                notes: '',
                timeUnit: 'hours',
            },
            subtask: {
                name: '',
                timeEstimate: null,
                workOnInput: '',
                workOnDate: '',
                completionInput: '',
                completionDate: '',
                notes: '',
                timeUnit: 'hours',
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
        taskClass() {
            let classes = ['task'];
            let currentLevel = this.level;

            if (currentLevel === 0) {
                classes.push('primary');
            } else if (currentLevel === 1) {
                classes.push('subtask-level-1');
            } else if (currentLevel === 2) {
                classes.push('subtask-level-2');
            } else if (currentLevel >= 3) {
                classes.push('subtask-level-3');
            }

            if (this.task.completed) {
                classes.push('completed');
            }
            return classes;
        },
        totalSubtaskTime() {
            return this.task.subtasks.reduce((total, sub) => 
                total + (sub.timeEstimate || 0), 0);
        },
        completedSubtaskTime() {
            return this.task.subtasks.reduce((total, sub) => 
                total + (sub.completed ? (sub.timeEstimate || 0) : 0), 0);
        },
        remainingSubtaskTime() {
            const remainingMinutes = this.task.subtasks
                .filter(sub => !sub.completed && sub.timeEstimate !== null)
                .reduce((total, sub) => {
                    return total + (sub.timeUnit === 'hours' ? sub.timeEstimate * 60 : sub.timeEstimate);
                }, 0);
            return remainingMinutes;
        },
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

            const newSubtask = {
                id: Date.now() + Math.random(), // Ensure uniqueness
                name: this.subtask.name,
                timeEstimate: this.subtask.timeEstimate,
                day: this.subtask.workOnDate && this.subtask.workOnDate !== 'N/A' ? (this.subtask.workOnDate.includes('/') ? null : this.subtask.workOnInput) : null,
                workOnDate: this.subtask.workOnDate && this.subtask.workOnDate !== 'N/A' ? this.subtask.workOnDate : null,
                completionDate: this.subtask.completionDate,
                completed: false,
                notes: this.subtask.notes,
                subtasks: [],
                timeUnit: this.subtask.timeUnit,
                isSubtask: true // Add this line to mark as subtask
            };
            if (!this.task.subtasks) {
                this.task.subtasks = [];
            }
            this.task.subtasks.push(newSubtask);
            this.calculateParentTimeEstimate();
            this.$emit('update-tasks');
            // Reset subtask form
            this.subtask = {
                name: '',
                timeEstimate: null,
                workOnInput: '',
                workOnDate: '',
                completionInput: '',
                completionDate: '',
                notes: '',
                timeUnit: 'hours',
            };
            this.showAddSubtask = false;
        },
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
            // Update subtasks
            if (this.task.subtasks && this.task.subtasks.length > 0) {
                this.task.subtasks.forEach(subtask => {
                    subtask.completed = this.task.completed;
                });
            }

            this.calculateParentTimeEstimate();
            this.$emit('update-ttasks');
        },

        deleteTask() {
            // Remove confirmation
            this.$emit('delete-task', this.task.id, this.task);
        },
        formatDate(dateStr, type) {
            if (!dateStr) return 'N/A';
            const date = new Date(dateStr);
            const options = { weekday: 'long', month: 'short', day: 'numeric' };
            const formatted = date.toLocaleDateString('en-US', options);

            // Only add days remaining for completion dates
            if (type === 'completion') {
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
                let totalMinutes = 0;
                this.task.subtasks.forEach(sub => {
                    if (sub.timeEstimate !== null) {
                        totalMinutes += sub.timeUnit === 'hours' 
                            ? sub.timeEstimate * 60 
                            : sub.timeEstimate;
                    }
                });
                
                const hasSubtasksWithEstimates = this.task.subtasks.some(sub => sub.timeEstimate !== null);
                if (hasSubtasksWithEstimates) {
                    // Set parent task's timeEstimate to the sum of subtasks
                    this.task.timeEstimate = totalMinutes / 60; // Convert back to hours if needed
                } else {
                    // If no subtasks have estimates, you might want to keep the parent's own estimate
                    // or set it to 0. Adjust based on desired behavior
                    this.task.timeEstimate = 0;
                }
            }
            
            // Ensure that parent tasks with subtasks do not contribute to daily totals directly
            if (this.isSubtask && this.parentTask) {
                this.parentTask.timeEstimate = this.parentTask.subtasks.reduce((sum, sub) => {
                    return sum + (sub.timeUnit === 'hours' ? sub.timeEstimate * 60 : sub.timeEstimate);
                }, 0) / 60;
            }
        },
        onDragEnd() {
            this.calculateParentTimeEstimate();
            this.$emit('update-tasks');
        },
        parseSubtaskDateInput(input, type) {
            // Similar to parseEditDateInput, adjust accordingly
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
                notes: this.task.notes,
                timeUnit: this.task.timeUnit || 'hours',
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

            // Update the task with all fields, including dates
            Object.assign(this.task, {
                name: this.editTask.name,
                timeEstimate: this.editTask.timeEstimate,
                timeUnit: this.editTask.timeUnit,
                workOnDate: this.editTask.workOnDate,
                workOnInput: this.editTask.workOnInput,
                completionDate: this.editTask.completionDate,
                completionInput: this.editTask.completionInput,
                notes: this.editTask.notes,
                day: this.editTask.workOnDate && this.editTask.workOnDate !== 'N/A' ? 
                    (this.editTask.workOnDate.includes('/') ? null : this.editTask.workOnInput) : null
            });

            // Recalculate parent time estimate if necessary
            this.calculateParentTimeEstimate();
            this.isEditing = false;
            this.$emit('update-tasks');
        },
        cancelEdit() {
            this.isEditing = false;
        },
        parseEditDateInput(input, type) {
            // Similar to previous code
        },
        deleteSubtask(subTaskId) {
            if (this.isSubtask) {
                // If this is a subtask, propagate the deletion event up
                this.$emit('delete-subtask', this.parentTask.id, subTaskId);
            } else {
                // If this is a main task, emit the delete event
                this.$emit('delete-subtask', this.task.id, subTaskId);
            }
        },

        propagateDeleteSubtask(parentId, subTaskId) {
            // Propagate the delete-subtask event up through the component hierarchy
            this.$emit('delete-subtask', parentId, subTaskId);
        },
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
            event.preventDefault();

            const button = event.currentTarget;
            let input;

            if (this.isEditing) {
                input = field === 'workOn' ? this.$refs.workOnInput : this.$refs.completionInput;
            } else {
                input = field === 'workOn' ? this.$refs.subWorkOnInput : this.$refs.subCompletionInput;
            }

            if (this.picker) {
                this.picker.destroy();
                this.picker = null;
            }

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

        formatTimeEstimate(value, unit) {
            if (value === null) return 'N/A';
            if (unit === 'hours') {
                return value === 1 ? `${value} hour` : `${value} hours`;
            } else {
                return value === 1 ? `${value} minute` : `${value} minutes`;
            }
        },
        formatRemainingTime(minutes) {
            const hrs = Math.floor(minutes / 60);
            const mins = minutes % 60;
            let result = '';
            if (hrs > 0) {
                result += `${hrs}hr${hrs > 1 ? 's' : ''} `;
            }
            if (mins > 0) {
                result += `${mins}min`;
            }
            return result.trim() || '0min';
        },
        removeSubtask(subTaskId) {
            this.deleteSubtask(subTaskId); // Ensure this line calls the deleteSubtask method
        },
    },
    created() {
        // Listen for delete-task events from child components
        this.$on('delete-task', this.deleteSubtask);
    },
    beforeDestroy() {
        if (this.picker) {
            this.picker.destroy();
            this.picker = null;
        }
    }
});