<form autocomplete="off" action="<?= base_url('admin/events/add') ?>" method="post" enctype="multipart/form-data">
    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    <div class="live-preview">
                        <div class="row">
                            <!-- Title -->
                            <div class="col-lg-6 p-2">
                                <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
                                <input type="text" class="form-control" id="title" name="title" required>
                            </div>

                            <!-- Image -->
                            <div class="col-lg-6 p-2">
                                <label for="image" class="form-label">Image<span class="required text-danger">*</span></label>
                                <input type="file" class="form-control" id="image" name="image" accept="image/*" required>
                            </div>

                            <!-- Description -->
                            <div class="col-lg-12 p-2">
                                <label for="description" class="form-label">Description</label>
                                <textarea class="form-control" id="description" name="description" rows="4"></textarea>
                            </div>

                            <div class="col-lg-6 p-2">
                                <label for="instructor_id" class="form-label">Instructors<span class="required text-danger">*</span></label>
                                <select class="form-control" name="instructor_id">
                                    <option value="">Choose Instructor</option>
                                    <?php foreach($instructors as $instructor){ ?>
                                        <option value="<?=$instructor['id']?>"><?=$instructor['name']?></option>
                                    <?php } ?>    
                                </select>
                            </div>
                            
                            <!-- From Time -->
                            <div class="col-lg-6 p-2">
                                <label for="event_date" class="form-label">Event Date<span class="required text-danger">*</span></label>
                                <input type="date" class="form-control" id="event_date" name="event_date" required>
                            </div>

                            <!-- From Time -->
                            <div class="col-lg-6 p-2">
                                <label for="from_time" class="form-label">From Time<span class="required text-danger">*</span></label>
                                <input type="time" class="form-control" id="from_time" name="from_time" required>
                            </div>

                            <!-- To Time -->
                            <div class="col-lg-6 p-2">
                                <label for="to_time" class="form-label">To Time<span class="required text-danger">*</span></label>
                                <input type="time" class="form-control" id="to_time" name="to_time" required>
                            </div>
                            
                              <!-- From Time -->
                            <div class="col-lg-6 p-2">
                                <label for="duration" class="form-label">Duration<span class="required text-danger">*</span></label>
                                <input type="text" class="form-control" id="duration" name="duration" required readonly>
                            </div>
                            <div class="col-lg-6 p-2">
                                <br>
                                <div class="mt-3">
                                    <div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" value="1" name="is_recording_available" id="defaultIndeterminateCheck1">
                                            <label class="form-check-label" for="defaultIndeterminateCheck1">
                                               Is Recording Available?
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Number of Objectives -->
                            <div class="col-lg-6 p-2">
                                <label for="num_objectives" class="form-label">Number of Objectives</label>
                                <input type="number" class="form-control" id="num_objectives" name="num_objectives" min="1" placeholder="Enter number of objectives">
                            </div>
                            <div class="col-lg-6 p-2">
                                <button type="button" class="btn btn-primary mt-4" id="generate_objectives">Generate Inputs</button>
                            </div>

                            <!-- Objectives -->
                            <div class="col-lg-12 p-2" id="objectives_container"></div>

                            <!-- Save Button -->
                            <div class="col-12 p-2">
                                <button class="btn btn-success float-end btn-save" type="submit">
                                    <i class="ri-check-fill"></i> Save
                                </button>
                            </div>
                        </div>
                        <!--end row-->
                    </div>
                </div>
            </div>
        </div>
    </div>
</form>

<script>

$(document).ready(function () {
    // Function to calculate the duration between from_time and to_time
    function calculateDuration() {
        var fromTime = $('#from_time').val();
        var toTime = $('#to_time').val();

        if (fromTime && toTime) {
            // Parse the times into Date objects
            var from = new Date('1970-01-01T' + fromTime + 'Z');
            var to = new Date('1970-01-01T' + toTime + 'Z');

            // Ensure toTime is after fromTime, if not adjust
            if (to < from) {
                to.setDate(to.getDate() + 1); // Move toTime to the next day if it's before fromTime
            }

            // Calculate the difference in milliseconds
            var durationMs = to - from;

            // Calculate hours and minutes
            var hours = Math.floor(durationMs / (1000 * 60 * 60));
            var minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

            // Format the duration as X:Y (e.g., 1:30)
            var duration = hours + ':' + (minutes < 10 ? '0' + minutes : minutes) + ' hour';

            // Set the duration field value
            $('#duration').val(duration);
        }
    }

    // Bind the calculateDuration function to both from_time and to_time fields
    $('#from_time, #to_time').on('change', function () {
        calculateDuration();
    });
});


    document.getElementById('generate_objectives').addEventListener('click', function () {
        const numObjectives = document.getElementById('num_objectives').value;
        const container = document.getElementById('objectives_container');
        container.innerHTML = ''; // Clear previous inputs

        for (let i = 1; i <= numObjectives; i++) {
            const div = document.createElement('div');
            div.className = 'p-2';
            div.innerHTML = `
                <label for="objective_${i}" class="form-label">Objective ${i}</label>
                <input type="text" class="form-control" id="objective_${i}" name="objectives[]" placeholder="Enter objective ${i}">
            `;
            container.appendChild(div);
        }
    });
</script>
