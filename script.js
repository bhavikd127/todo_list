document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const taskInput = document.getElementById('task-input');
    const statusSelect = document.getElementById('status-select');
    const dueDateInput = document.getElementById('due-date');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const currentDateDisplay = document.getElementById('current-date');
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthYear = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');

    // Current date
    const today = new Date();
    let currentMonth = today.getMonth();
    let currentYear = today.getFullYear();

    // Initialize app
    displayCurrentDate();
    renderCalendar();
    loadTasks();
    setupEventListeners();
    checkReminders();

    function setupEventListeners() {
        // Add task
        addTaskBtn.addEventListener('click', addTask);
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addTask();
        });

        // Filter tasks
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                filterTasks(this.dataset.filter);
            });
        });

        // Calendar navigation
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar();
        });

        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar();
        });

        // New feature event listeners
        document.getElementById('delete-completed').addEventListener('click', deleteCompletedTasks);
        document.getElementById('delete-all').addEventListener('click', deleteAllTasks);
        document.getElementById('search-btn').addEventListener('click', () => {
            searchTasks(document.getElementById('search-input').value);
        });
        document.getElementById('search-input').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') searchTasks(e.target.value);
        });
        document.getElementById('export-btn').addEventListener('click', exportTasks);
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-input').click();
        });
        document.getElementById('import-input').addEventListener('change', importTasks);

        // Check for reminders every minute
        setInterval(checkReminders, 60000);
    }

    function displayCurrentDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateDisplay.textContent = today.toLocaleDateString('en-US', options);
    }

    function addTask() {
        const title = taskInput.value.trim();
        const status = statusSelect.value;
        const dueDate = dueDateInput.value;
        const priority = document.getElementById('priority-select').value;
        const category = document.getElementById('category-select').value;

        if (!title) {
            alert('Please enter a task title');
            return;
        }

        const task = {
            id: Date.now(),
            title,
            status,
            priority,
            category,
            dueDate: dueDate || null,
            createdAt: new Date().toISOString()
        };

        saveTask(task);
        renderTask(task);
        renderCalendar();

        taskInput.value = '';
        dueDateInput.value = '';
        statusSelect.value = 'pending';
        taskInput.focus();
    }

    function saveTask(task) {
        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.push(task);
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function loadTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.forEach(task => renderTask(task));
    }

    function renderTask(task) {
        const taskItem = document.createElement('li');
        taskItem.className = 'task-item';
        taskItem.dataset.id = task.id;
        taskItem.dataset.status = task.status;
        
        // Apply priority style
        if (task.priority) {
            applyPriorityStyle(taskItem, task.priority);
        }

        const statusClass = `status-${task.status.replace(' ', '-')}`;

        taskItem.innerHTML = `
            <div class="task-info">
                <span class="task-title ${task.status === 'done' ? 'task-completed' : ''}">${task.title}</span>
                ${task.dueDate ? `<span class="task-due-date">Due: ${formatDate(task.dueDate)}</span>` : ''}
                ${task.category ? `<span class="task-category">${task.category.toUpperCase()}</span>` : ''}
            </div>
            <span class="task-status ${statusClass}">${formatStatus(task.status)}</span>
            <div class="task-actions">
                <button class="edit-btn" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        `;

        taskItem.querySelector('.edit-btn').addEventListener('click', () => editTask(task.id));
        taskItem.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));

        taskList.appendChild(taskItem);
    }

    function editTask(taskId) {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const task = tasks.find(t => t.id == taskId);
        
        if (!task) return;

        taskInput.value = task.title;
        statusSelect.value = task.status;
        dueDateInput.value = task.dueDate || '';
        document.getElementById('priority-select').value = task.priority || 'medium';
        document.getElementById('category-select').value = task.category || 'personal';
        
        deleteTask(taskId, false);
        taskInput.focus();
    }

    function deleteTask(taskId, updateStorage = true) {
        const taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`);
        if (taskElement) {
            taskElement.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => taskElement.remove(), 300);
        }

        if (updateStorage) {
            let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
            tasks = tasks.filter(task => task.id != taskId);
            localStorage.setItem('tasks', JSON.stringify(tasks));
            renderCalendar();
        }
    }

    function filterTasks(status) {
        const allTasks = document.querySelectorAll('.task-item');
        
        allTasks.forEach(task => {
            if (status === 'all' || task.dataset.status === status) {
                task.style.display = 'flex';
            } else {
                task.style.display = 'none';
            }
        });
    }

    function renderCalendar() {
        calendarGrid.innerHTML = '';

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        currentMonthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        for (let i = firstDay - 1; i >= 0; i--) {
            const day = document.createElement('div');
            day.className = 'calendar-day other-month';
            day.innerHTML = `<div class="calendar-day-number">${daysInPrevMonth - i}</div>`;
            calendarGrid.appendChild(day);
        }

        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        
        for (let i = 1; i <= daysInMonth; i++) {
            const day = document.createElement('div');
            day.className = 'calendar-day';
            
            const date = new Date(currentYear, currentMonth, i);
            if (date.toDateString() === today.toDateString()) {
                day.classList.add('today');
            }
            
            day.innerHTML = `<div class="calendar-day-number">${i}</div>`;
            
            const dateStr = formatDateForCalendar(date);
            const dayTasks = tasks.filter(task => task.dueDate === dateStr);
            
            dayTasks.forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.className = 'calendar-task';
                taskElement.textContent = task.title;
                taskElement.style.backgroundColor = getStatusColor(task.status);
                day.appendChild(taskElement);
            });
            
            calendarGrid.appendChild(day);
        }

        const totalCells = 42;
        const daysAdded = firstDay + daysInMonth;
        const daysFromNextMonth = totalCells - daysAdded;
        
        for (let i = 1; i <= daysFromNextMonth; i++) {
            const day = document.createElement('div');
            day.className = 'calendar-day other-month';
            day.innerHTML = `<div class="calendar-day-number">${i}</div>`;
            calendarGrid.appendChild(day);
        }
    }

    // New Feature Functions
    function deleteCompletedTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const incompleteTasks = tasks.filter(task => task.status !== 'done');
        localStorage.setItem('tasks', JSON.stringify(incompleteTasks));
        location.reload();
    }

    function deleteAllTasks() {
        if (confirm('Are you sure you want to delete ALL tasks?')) {
            localStorage.removeItem('tasks');
            location.reload();
        }
    }

    function searchTasks(query) {
        const tasks = document.querySelectorAll('.task-item');
        tasks.forEach(task => {
            const title = task.querySelector('.task-title').textContent.toLowerCase();
            task.style.display = title.includes(query.toLowerCase()) ? 'flex' : 'none';
        });
    }

    function applyPriorityStyle(taskElement, priority) {
        taskElement.classList.remove('priority-high', 'priority-medium', 'priority-low');
        taskElement.classList.add(`priority-${priority}`);
    }

    function checkReminders() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const now = new Date();
        
        tasks.forEach(task => {
            if (task.dueDate && !task.reminderShown) {
                const dueDate = new Date(task.dueDate);
                const diffHours = (dueDate - now) / 36e5;
                
                if (diffHours < 24 && diffHours > 0) {
                    showReminder(task);
                    task.reminderShown = true;
                    localStorage.setItem('tasks', JSON.stringify(tasks));
                }
            }
        });
    }

    function showReminder(task) {
        const reminder = document.createElement('div');
        reminder.className = 'reminder-alert';
        reminder.innerHTML = `
            <strong>Reminder!</strong>
            <p>"${task.title}" is due soon!</p>
            <small>Due: ${formatDate(task.dueDate)}</small>
        `;
        document.body.appendChild(reminder);
        
        setTimeout(() => {
            reminder.style.animation = 'fadeOut 0.5s forwards';
            setTimeout(() => reminder.remove(), 500);
        }, 5000);
    }

    function exportTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const dataStr = JSON.stringify(tasks, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportName = 'tasks_'+new Date().toISOString().slice(0,10)+'.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportName);
        linkElement.click();
    }

    function importTasks(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const tasks = JSON.parse(e.target.result);
                if (Array.isArray(tasks)) {
                    localStorage.setItem('tasks', JSON.stringify(tasks));
                    location.reload();
                } else {
                    alert('Invalid tasks file format');
                }
            } catch (error) {
                alert('Error reading file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    // Helper functions
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatDateForCalendar(date) {
        return date.toISOString().split('T')[0];
    }

    function formatStatus(status) {
        return status.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    function getStatusColor(status) {
        switch(status) {
            case 'pending': return '#ffc107';
            case 'in-progress': return '#4fc3f7';
            case 'done': return '#28a745';
            default: return '#f8f9fa';
        }
    }
});