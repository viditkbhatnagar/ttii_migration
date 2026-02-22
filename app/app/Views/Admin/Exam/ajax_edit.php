 <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
<form action="<?=base_url('admin/exam/edit/'.$edit_data['id'])?>" method="post">
    <div class="row">
        <div class="col-12 form-group p-2"> 
            <label for="start_date" class="form-label">Title<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" id="" name="title" value="<?=$edit_data['title']?>" required>
        </div>
        <div class="col-12 p-2 form-group">
            <label for="title" class="form-label">Instructions</label>
            <textarea class="form-textarea editor" name="description" id="editor1"></textarea>
        </div>
        <div class="col-12 form-group p-2">
            <label for="start_date" class="form-label">Mark<span class="required text-danger">*</span></label>
            <input type="number" class="form-control" id="" name="mark" value="<?=$edit_data['mark']?>" required>
        </div>
            <div class="col-12 form-group p-2">
                <label for="duration" class="form-label">Duration<span class="required text-danger">*</span></label>
                <input type="text" class="form-control" id="duration" name="duration" value="<?=$edit_data['duration']?>" required>
          </div>
        <div class="col-12 form-group p-2">
            <label for="start_date" class="form-label">Date<span class="required text-danger">*</span></label>
            <input type="date" class="form-control" id="start_date" name="from_date" value="<?=$edit_data['from_date']?>" required>
        </div>
        <div class="col-12 form-group p-2">
            <label for="start_date" class="form-label">Start Time<span class="required text-danger">*</span></label>
            <input type="time" class="form-control" id="start_date" name="from_time" value="<?=$edit_data['from_time']?>" required>
        </div>
        <div class="col-12 form-group p-2 d-none">
            <label for="end_date" class="form-label">End Date<span class="required text-danger">*</span></label>
            <input type="date" class="form-control" id="end_date" name="to_date" value="<?=$edit_data['to_date']?>" >
        </div>
        <div class="col-12 form-group p-2">
            <label for="end_date" class="form-label">End Time<span class="required text-danger">*</span></label>
            <input type="time" class="form-control" id="end_date" name="to_time" value="<?=$edit_data['to_time']?>" required>
        </div>
        <div class="col-12 form-group p-2">
            <label for="course_id" class="form-label">Course<span class="required text-danger">*</span></label>
            <select class="form-control select2" name="course_id" id="course_id" required onchange="get_subject(this.value)">
                <option value="0">Select Course</option>
                <?php foreach($course as $val){ ?>
                <option value="<?=$val['id']?>" <?=($edit_data['course_id']==$val['id']) ? 'selected' : '' ?>><?=$val['title']?></option>
                <?php } ?>
            </select>
        </div>
        <div class="col-12 form-group p-2">
            <label for="course_id" class="form-label">Subject</label>
            <select class="form-control select2" name="subject_id" id="subject_id"  onchange="get_lesson(this.value)">
                <option value="0">Select Subject</option>
            </select>
        </div>
        <div class="col-12 form-group p-2">
            <label for="course_id" class="form-label">Lesson</label>
            <select class="form-control select2" name="lesson_id" id="lesson_id" >
                <option value="0">Select Lesson</option>
            </select>
        </div>
        <!--<div class="col-12 form-group p-2">-->
        <!--    <label for="" class="form-label">Is Practice?</label>-->
        <!--    <input type="checkbox" value="1" name="is_practice" <?=($edit_data['is_practice']==1) ? 'checked' : '' ?>>-->
        <!--</div>-->
        <!--<div class="col-12 form-group p-2">-->
        <!--    <label for="" class="form-label">Is Free?</label>-->
        <!--    <input type="checkbox" value="1" name="free" <?//=($edit_data['free']==1) ? 'checked' : '' ?>>-->
        <!--</div>-->
        <div class="col-lg-6 p-2">
            <div class="mt-3">
                <div>
                    <!--<div class="form-check">-->
                    <!--    <input class="form-check-input" type="checkbox" value="1" name="is_practice" id="defaultIndeterminateCheck1">-->
                    <!--    <label class="form-check-label" for="defaultIndeterminateCheck1">Is Practice?</label>-->
                    <!--</div>-->
                    
                    <div class="col-12 form-group pb-2">
                        <input class="form-check-input" type="checkbox" value="1" name="free" <?=($edit_data['free']==1) ? 'checked' : '' ?>>
                        <label for="" class="form-label">Is Free?</label>
                    </div> 
                </div>
            </div>
        </div>
        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script>
    // Initialize Flatpickr for duration field with proper format
    flatpickr("#duration", {
      enableTime: true,
      noCalendar: true,
      dateFormat: "H:i:S", // Make sure seconds are included
      time_24hr: true,
      onChange: function(selectedDates, dateStr, instance) {
        console.log("Selected duration:", dateStr); // Check the output here
      }
    });
</script>
<script>
  function get_subject(course_id){
         $.ajax({
            url: '<?php echo base_url("Admin/Exam/get_subject_question"); ?>',
            type: 'POST',
            data: { course_id: course_id },
            success: function(data) {
                // Append HTML options to select element
                $('#subject_id').html(data);
            }
        });
    }
        function get_lesson(subject_id){
         $.ajax({
            url: '<?php echo base_url("Admin/Exam/get_lesson_question"); ?>',
            type: 'POST',
            data: { subject_id: subject_id },
            success: function(data) {
                // Append HTML options to select element
                $('#lesson_id').html(data);
            }
        });
    }


$(document).ready(function() {
      $("#course_id").select2({
        dropdownParent: $("#ajax_modal")
      });
      
      
    var course_id = <?=$edit_data['course_id']?>;
    var selected_subject_id = <?=$edit_data['subject_id']?>;
    
      $.ajax({
        url: '<?php echo base_url("Admin/Question_bank/get_subjects"); ?>',
        type: 'POST',
        data: { 
            course_id: course_id,
            selected_subject_id: selected_subject_id  // Pass the selected package ID
        },
        success: function(data) {
            // Append HTML options to select element
            $('#subject_id').html(data);
        }
    });
    
    
    var subject_id = <?=$edit_data['subject_id']?>;
    var selected_lesson_id = <?=$edit_data['lesson_id']?>;
    
    $.ajax({
        url: '<?php echo base_url("Admin/Question_bank/get_lessons"); ?>',
        type: 'POST',
        data: { 
            subject_id: subject_id,
            selected_lesson_id: selected_lesson_id  // Pass the selected package ID
        },
        success: function(data) {
            // Append HTML options to select element
            $('#lesson_id').html(data);
        }
    });
});

$(document).ready(function() {
      $("#subject_id").select2({
        dropdownParent: $("#ajax_modal")
      });
});


$(document).ready(function() {
      $("#lesson_id").select2({
        dropdownParent: $("#ajax_modal")
      });
});


    $(document).ready(function() {
        // Initialize CKEditor
        ClassicEditor
            .create( document.querySelector( '#editor1' ) )
            .catch( error => {
                console.error( error );
            });

    });
  </script>