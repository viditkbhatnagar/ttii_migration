<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('admin/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>

        </div>
    </div>
</div>

<div class="container">
    <div id="calendar"></div>
</div>


<script>
$(document).ready(function () {
    let eventsData = <?= $events ?>; // Inject PHP JSON data

    $('#calendar').fullCalendar({
        initialView: 'dayGridMonth',
        editable: false, // Prevent dragging
        selectable: false, // Prevent selection
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: eventsData, // Assign events array

        eventRender: function (event, element) {
            let startTime = moment(event.start).format('hh:mm A');
            let endTime = moment(event.end).format('hh:mm A');
            let eventColor = event.type === 'Exam' ? '#FF8A8A' : '#BBE9FF';

            // Custom Event Content with Icons & Styling
            let customHtml = `
                <div class="custom-event text-dark">
                    <strong>${event.type} - ${event.title}</strong> <br>
                    <span class="event-time">${startTime} - ${endTime}</span>
                </div>
            `;

            // Apply custom HTML
            element.html(customHtml);

            // Bootstrap Tooltip for Extra Info
            $(element).tooltip({
                title: `<b>${event.title}</b><br> ${startTime} - ${endTime}`,
                html: true
            });

            // Styling
            element.css({
                'background-color': eventColor,
                'border-color': eventColor,
                'color': '#fff',
                'padding': '5px',
                'border-radius': '5px'
            });
        }
    });
});

</script>