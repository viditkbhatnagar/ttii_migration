<form action="<?= base_url('app/students/edit_enrolled_courses/'.$enrol_detail['id']) ?>" method="post">
    <div class="row g-3">
        <!--<input type="hidden" class="form-control" id="student_id" name="student_id" value="<?//= $student_id ?>" placeholder="Enter Session No." />-->
        <div class="col-lg-12">
            <div>
                <label for="course_id" class="form-label">Course</label>
                <select class="form-control select2" name="course_id" id="course_id">
                    <option value="">Select Course</option>
                    <?php if(!empty($course_list)) { 
                        foreach ($course_list as $course) { ?>
                            <option value="<?= $course['id'] ?>" <?= ($course['id'] == $enrol_detail['course_id']) ? 'selected' : '' ?>><?= $course['title'] ?></option>
                        <?php } 
                    } else { ?>
                        <option value="">No Courses Available</option>
                    <?php } ?>
                </select>
            </div>
        </div>
        <!--<div class="col-lg-12">-->
        <!--    <div>-->
        <!--        <label for="teacher_id" class="form-label">Individual</label>-->
        <!--        <select class="form-control select2" name="teacher_id" id="teacher_id">-->
        <!--            <option value="">Select Individual</option>-->
        <!--            <?php foreach($teachers_list as $teacher) { ?>-->
        <!--                <option value="<?= $teacher['id'] ?>" <?= ($teacher['id'] == $enrol_detail['teacher_id']) ? 'selected' : '' ?>><?= $teacher['name'] ?></option>-->
        <!--            <?php } ?>-->
        <!--        </select>-->
        <!--    </div>-->
        <!--</div>-->
        <div class="col-12 p-2">
            <button class="btn btn-success float-end" type="submit"><i class="ri-check-fill"></i> Save</button>
        </div>
    </div>
</form>

<script>
$(document).ready(function() {
    $('.select2').select2(); 

    $("#course_id").select2({
        dropdownParent: $("#small_modal")
    });
    $("#subject_id").select2({
        dropdownParent: $("#small_modal")
    });
    $("#teacher_id").select2({
        dropdownParent: $("#small_modal")
    });

    $('#course_id').change(function() {
        var course_id = $(this).val();
    });

    $('#subject_id').change(function() {
        var course_id = $('#course_id').val();
        var subject_id = $(this).val();
        get_teacher(course_id);
    });
});


function get_teacher(course_id, subject_id) {
    $.ajax({
        url: '<?= base_url("app/teachers/get_teacher_by_course") ?>',
        type: 'POST',
        data: { course_id: course_id },
        success: function(data) {
            console.log(data); // Log the response data
            $('#teacher_id').html(data); // Assuming 'data' contains <option> elements
        },
        error: function(xhr, status, error) {
            console.error(error);
        }
    });
}
</script>
