<!-- start page title -->
<style>
    /* Increase the size of the checkbox */
    .custom-checkbox {
        transform: scale(1.5); /* Adjust the scale factor as needed */
    }
</style>
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
<div class="row">
    <div class="col-lg-12">
        
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-8">
                        <h5 class="card-title mb-0"><?=$page_title ?? ''?></h5>
                    </div>
                    <div class="col-4">
                        <a href="<?=base_url('admin/exam/exam_questions/'.$exam_id)?>">
                            <button class="btn btn-md btn-secondary float-end"><i class="mdi mdi-arrow-left"></i> Back To Exam</button>
                        </a>
                    </div>
                </div>
            </div>
            
             <div class="card-body">
                <div class="row">
                   
                   
                    <form method="get" action="">
                        <div class="row g-3">
                           

                            <div class="col-xxl-2 col-sm-3">
                                <div class="input-light">
                                    <select class="form-control select2" name="course_id" id="course_id" onchange="get_lesson(this.value)">
                                      <option value="">Choose Course</option>
                                        <?php foreach($courses as $course){ ?>
                                            <option value="<?=$course['id']?>" <?=(isset($_GET['course_id']) && ($_GET['course_id'] == $course['id'])) ? 'selected' : ''?>><?=$course['title']?></option>
                                        <?php } ?>   
                                    </select>
                                </div>
                            </div>
                            <!--end col-->
                             
                            
                            <div class="col-xxl-2 col-sm-3">
                                <div class="input-light">
                                    <select class="form-control select2" name="lesson_id" id="lesson_id">
                                        <option value="">Choose Lesson</option>
                                    </select>
                                </div>
                            </div>
                            <!--end col-->
                      


                            <div class="col-xxl-1 col-sm-2">
                                 <input type="submit" class="btn btn-primary" value="Search">

                            </div>
                            
                      
                            
                            <!--end col-->
                        </div>
                        <!--end row-->
                    </form>
                </div><!-- end row -->
            </div>

            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                        <tr>
                            <th style="width: 50px;">#</th>
                            <th style="width: 150px;">Question</th>
                            <th style="width: 20px;">Add Question</th>
                        </tr> 
                    </thead>  
                    <tbody>
                    <?php 
                        if (isset($list_items)){
                            foreach ($list_items as $key => $list_item){?>     
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?=$list_item['title']?></td> 
                                    <input type="hidden" value="<?=$_GET['course_id']?>" name="selected_course" id="selected_course">
                                    <input type="hidden" value="<?=$_GET['lesson_id']?>" name="selected_lesson" id="selected_lesson">
                                    <td><input type="checkbox" class="custom-checkbox" id="checkbox<?=$list_item['id']?>" <?=($list_item['is_checked']==1) ? 'checked' : ''?> onchange="add_question_to_exam(this, <?=$exam_id?>, <?=$list_item['id']?>)"></td>
                                </tr>
                            <?php }
                        }
                    ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div><!--end row-->

<script> 
$(document).ready(function() {
    var course_id = $('#selected_course').val();
    var selected_lesson_id = $('#selected_lesson').val();

    $.ajax({
        url: '<?php echo base_url("Admin/Question_bank/get_lessons"); ?>',
        type: 'POST',
        data: { 
            course_id: course_id,
            selected_lesson_id: selected_lesson_id  // Pass the selected package ID
        },
        success: function(data) {
            // Append HTML options to select element
            $('#lesson_id').html(data);
        }
    });    
});

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

function get_lesson(course_id){
     $.ajax({
        url: '<?php echo base_url("Admin/Exam/get_lesson_question"); ?>',
        type: 'POST',
        data: { course_id: course_id },
        success: function(data) {
            // Append HTML options to select element
            $('#lesson_id').html(data);
        }
    });
}

function add_question_to_exam(checkbox, exam_id, question_id) {
    var checkbox_value = checkbox.checked ? 1 : 0;

    $.ajax({
        url: '<?php echo base_url("Admin/Exam/add_question_to_exam"); ?>',
        type: 'POST',
        data: {
            exam_id: exam_id,
            checkbox_value: checkbox_value,
            question_id: question_id
        },
        success: function(data) {
            // Handle success response if needed
        }
    });
}
</script>
