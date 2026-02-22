<input type="hidden" value="<?=$edit_data['course_id'] ?? '' ?>" id="selected_course_id">
<input type="hidden" value="<?=$edit_data['subject_id'] ?? '' ?>" id="selected_subject_id">
<input type="hidden" value="<?=$edit_data['instructor_id'] ?? '' ?>" id="selected_instructor_id">

<form autocomplete="off" id="addCohortBasicForm" method="post" enctype="multipart/form-data" action="<?= isset($edit_data) && $edit_data['id'] ? base_url('admin/cohorts/edit/'.$edit_data['id']) : base_url('admin/cohorts/add') ?>">
    <div class="row">
         <div class="col-6 form-group p-2">
            <label for="cohort_id" class="form-label">Cohort ID<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" id="cohort_id" name="cohort_id" placeholder="Title" required value="<?= $edit_data['cohort_id'] ?? $cohort_id ?? '' ?>" readonly>
        </div>
        <div class="col-6 form-group p-2">
            <label for="title" class="form-label">Cohort Name<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" id="title" name="title" placeholder="Title" required value="<?= $edit_data['title'] ?? '' ?>"> 
        </div>
        
        
         <div class="col-6 form-group p-2">
            <label for="course_id" class="form-label">Course<span class="required text-danger">*</span></label>
            <select class="form-control select2" name="course_id" id="course_id" required onchange="get_subject(this.value)">
                <option value="0" disabled selected>Select Course</option>
                <?php foreach($course as $val){ ?>
                <option value="<?= $val['id'] ?>" <?= isset($edit_data) && $edit_data['course_id'] == $val['id'] ? 'selected' : '' ?>>
                    <?= $val['title'] ?>
                </option>
                <?php } ?>
            </select>
        </div>
        <div class="col-6 form-group p-2">
            <label for="course_id" class="form-label">Subject<span class="required text-danger">*</span></label>
            <select class="form-control select2" name="subject_id" id="subject_id" required >
            </select>
        </div>
        
          
         <div class="col-6 form-group p-2">
            <label for="language_id" class="form-label">Language<span class="required text-danger">*</span></label>
            <select class="form-control select2" name="language_id" id="language_id" required >
                <option >Select Language</option>
                <?php foreach($language as $val){ ?>
                <option value="<?= $val['id'] ?>" <?= isset($edit_data) && $edit_data['language_id'] == $val['id'] ? 'selected' : '' ?>>
                    <?= $val['title'] ?>
                </option>
                <?php } ?>
            </select>
        </div>
        
         <div class="col-6 form-group p-2">
            <label for="instructor_id" class="form-label">Instructor<span class="required text-danger">*</span></label>
            <select class="form-control select2" name="instructor_id" id="instructor_id"  required>
            </select>
        </div>
        
         <div class="col-6 form-group p-2">
            <label for="start_date" class="form-label">Start Date<span class="required text-danger">*</span></label>
            <input type="date" class="form-control" id="start_date" name="start_date"  required value="<?= $edit_data['start_date'] ?? '' ?>">
        </div>
        
         <div class="col-6 form-group p-2">
            <label for="end_date" class="form-label">End Date<span class="required text-danger">*</span></label>
            <input type="date" class="form-control" id="end_date" name="end_date" placeholder="Title" required value="<?= $edit_data['end_date'] ?? '' ?>">
        </div>
    </div>
    
    <div class="d-flex align-items-start gap-3 mt-4">
        <a href="<?=base_url('admin/cohorts/')?>" class="btn btn-link text-decoration-none btn-label previestab" data-previous="pills-gen-info-tab">
            <i class="ri-arrow-left-line label-icon align-middle fs-16 me-2"></i> Back to Home
        </a>
        <button type="button" id="basicSubmitBtn" class="btn btn-success btn-label right ms-auto nexttab"><i class="ri-arrow-right-line label-icon align-middle fs-16 ms-2"></i><?= isset($edit_data) && $edit_data['id'] ? 'Save' : 'Save & Next'  ?></button>
    </div>
</form>

<script>
    
    $(document).ready(function(){
        
        var course_id = $('#selected_course_id').val();
        var selected_subject_id = $('#selected_subject_id').val();
        var selected_instructor_id = $('#selected_instructor_id').val();
        
        get_subject(course_id,selected_subject_id,selected_instructor_id)
        get_instructor(course_id,selected_instructor_id)
        
    })
    
</script>
  
<script>



    function get_subject(course_id,selected_subject_id,selected_instructor_id){
         $.ajax({
            url: '<?php echo base_url("Admin/Exam/get_subject_question"); ?>',
            type: 'POST',
            data: { course_id: course_id, selected_subject_id: selected_subject_id },
            success: function(data) {
                // Append HTML options to select element
                $('#subject_id').html(data);
                get_instructor(course_id,selected_instructor_id)
            }
        });
    }
    
    function get_instructor(course_id,selected_instructor_id){
        
        $.ajax({
                url: '<?php echo base_url("Admin/Live_class/get_instructor_without_select"); ?>',
                type: 'POST',
                data: { course_id: course_id , selected_instructor_id: selected_instructor_id },
                success: function(data) {
                    // Append HTML options to select element
                    $('#instructor_id').html(data);
                }
            });    
        
    }
    
    $('#course_id').change(function() {
        var courseName = $("#course_id option:selected").text();
        var year = new Date().getFullYear();
        var cohortTitle = courseName + ' - ' + year;
        
        $('#title').val(cohortTitle);
    });

</script>