<div class="card">
    <div class="card-body">
         <style>
        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
        }
        #calendar {
            margin-top: 20px;
        }
        .fc-event {
            background-color: #d6b3ff;
            border: none;
            color: #333;
            padding: 5px;
            border-radius: 4px;
            font-size: 14px;
        }
    </style>
    
     <div class="container">
        <h2>Upcoming Live Sessions</h2>
        <label for="weekPicker">Select a week:</label>
        <input type="date" id="weekPicker" class="form-control w-25 mb-3">
        <div id="calendar"></div>
    </div>

    <!-- jQuery (required for FullCalendar v3.x) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
    <!-- Moment.js (required for FullCalendar v3.x) -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js"></script>
    <!-- FullCalendar v3.x JS -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/3.10.2/fullcalendar.min.js"></script>
    <script>
        $(document).ready(function() {
            const weekPicker = document.getElementById("weekPicker");

            // Initialize FullCalendar v3.x
            $('#calendar').fullCalendar({
                header: {
                    left: "",
                    center: "title",
                    right: ""
                },
                defaultView: "agendaWeek",
                allDaySlot: false,
                minTime: "09:00:00",
                maxTime: "18:00:00",
                events: [
                    {
                        title: "The Art Of Motivation",
                        start: "2025-02-19T12:01:00",
                        end: "2025-02-19T13:50:00",
                        instructor: "Anas P"
                    },
                    {
                        title: "The Art Of Motivation",
                        start: "2025-02-20T11:25:00",
                        end: "2025-02-20T12:30:00",
                        instructor: "Anas P"
                    },
                    {
                        title: "The Art Of Motivation",
                        start: "2025-02-22T09:00:00",
                        end: "2025-02-22T10:10:00",
                        instructor: "Anas P"
                    }
                ],
                eventRender: function(event, element) {
                    // Customize event content
                    element.html(`
                        <div>
                            <strong>${event.title}</strong><br>
                            ${event.instructor}<br>
                            ${moment(event.start).format("h:mm A")} - ${moment(event.end).format("h:mm A")}
                        </div>
                    `);
                }
            });

            // Set default week to current week
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
            weekPicker.valueAsDate = startOfWeek;

            // Update calendar when a new week is selected
            weekPicker.addEventListener("change", function() {
                const selectedDate = new Date(this.value);
                $('#calendar').fullCalendar('gotoDate', selectedDate);
            });
        });
    </script>
    </div>
</div>