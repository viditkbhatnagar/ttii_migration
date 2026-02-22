<div class="container" style="margin-top: 20px;">
    <div id="calendar"></div>
</div>

<style>
/* Custom styles for calendar */
.fc-toolbar-chunk:first-child {
    display: flex;
    align-items: center;
}

.fc-prev-button, .fc-next-button {
    margin-right: 10px;
}

.fc-today-button {
    margin-left: auto !important;
}

/* Style for dates in top right corner of day cells */
.fc-daygrid-day-top {
    justify-content: flex-end !important;
}

.fc-daygrid-day-number {
    padding-right: 5px !important;
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    // Velzon automatically makes FullCalendar available
    const calendarEl = document.getElementById('calendar');
    
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        events: "<?= site_url('app/calendar/events') ?>",
        headerToolbar: {
            left: 'prev,next',
            center: 'title',
            right: 'today dayGridMonth,timeGridWeek,timeGridDay'
        }
    });
    
    calendar.render();
});
</script>