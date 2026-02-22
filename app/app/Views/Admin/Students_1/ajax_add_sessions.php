<form action="<?= base_url('app/students/add_sessions') ?>" method="post">
    <div class="row g-3">
        <input type="hidden" id="student_id" name="student_id" value="<?= $edit_data['student_id'] ?>" />
        <input type="hidden" id="course_id" name="course_id" value="<?= $edit_data['course_id'] ?>" />
        <input type="hidden" id="subject_id" name="subject_id" value="<?= $edit_data['subject_id'] ?>" />
        <input type="hidden" id="teacher_id" name="teacher_id" value="<?= $edit_data['teacher_id'] ?>" />
        <input type="hidden" id="session_no" name="session_no" value="<?= $session_no ?>" />
        <input type="hidden" id="sessions_count" name="sessions_count" value="<?= $edit_data['sessions'] ?>" />
        <div class="col-lg-12  ">
            <div>
                <label for="session_title" class="form-label">Session Title<span class="text-danger">*</span></label>
                <input type="text" class="form-control" id="session_title" name="session_title" placeholder="Enter Session Title" required />
            </div>
        </div>
        <div class="col-lg-12  ">
            <div>
                <label for="scheduled_date" class="form-label">Scheduled Date<span class="text-danger">*</span></label>
                <input type="month" class="form-control" id="scheduled_date" name="scheduled_date"  required />
            </div>
        </div>
        <!-- Days of the Week -->
        <div class="col-lg-12  ">
            <div>
                <label for="scheduled_date" class="form-label">Days <span class="text-danger">*</span></label>
                <div class="weekDays-selector">
                    <?php
                    $days = ['sun' => 'Sun', 'mon' => 'Mon', 'tue' => 'Tue', 'wed' => 'Wed', 'thu' => 'Thu', 'fri' => 'Fri', 'sat' => 'Sat'];
                    foreach ($days as $key => $day) { ?>
                        <input type="checkbox" id="weekday-<?= $key ?>" name="week[]" value="<?= $key ?>" class="weekday" onchange="toggleTimeFields('<?= $key ?>')" />
                        <label for="weekday-<?= $key ?>"><?= $day ?></label>
                    <?php } ?>
                </div>
            </div>
        </div>

        <!-- Time Inputs for Each Day (Initially Hidden) -->
        <?php foreach ($days as $key => $day) { ?>
            <div class="col-12 day-time-fields  " id="time-fields-<?= $key ?>" style="display: none;">
                <div class="row">
                    <div class="col-12">
                        <h5 class="h6"><?= $day ?></h5>
                    </div>
                    <div class="col-lg-6">
                        <div>
                            <label for="from_time_<?= $key ?>" class="form-label">From Time<span class="text-danger">*</span></label>
                            <input type="time" class="form-control" id="from_time_<?= $key ?>" name="from_time[<?= $key ?>]" value="" />
                        </div>
                    </div>

                    <div class="col-lg-6">
                        <div>
                            <label for="to_time_<?= $key ?>" class="form-label">To Time<span class="text-danger">*</span></label>
                            <input type="time" class="form-control" id="to_time_<?= $key ?>" name="to_time[<?= $key ?>]" value="" />
                        </div>
                    </div>
                </div>
            </div>
        <?php } ?>
        
        <div class="col-12 p-2">
            <button class="btn btn-success float-end" type="submit"><i class="ri-check-fill"></i> Save</button>
        </div>
    </div>
</form>

<script>
    // Function to dynamically show/hide time fields
    function toggleTimeFields(day) {
        let timeFields = document.getElementById('time-fields-' + day);
        if (document.getElementById('weekday-' + day).checked) {
            timeFields.style.display = 'block';
        } else {
            timeFields.style.display = 'none';
        }
    }
</script>
<!-- CSS for Weekday Selector -->
<style>
    .weekDays-selector input {
        display: none !important;
    }

    .weekDays-selector input[type=checkbox] + label {
        display: inline-block;
        border-radius: 6px;
        background: #dddddd;
        height: 40px;
        width: 40px;
        margin-right: 10px;
        line-height: 40px;
        text-align: center;
        cursor: pointer;
    }

    .weekDays-selector input[type=checkbox]:checked + label {
        background: #183267;
        color: #ffffff;
    }
</style>
