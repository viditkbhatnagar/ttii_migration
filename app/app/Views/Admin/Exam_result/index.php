<?php  
    if(isset($_GET['course_id'])){
        $course_id = $_GET['course_id'];
    }else{
        $course_id='';
    }
?>

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
<form action="" method="get">
    <div class="row mb-3">
        <div class="col-3">
            <select class="form-control select2" name="course_id" id="course_id" onchange="get_exam(this.value)">
                <option value="">Choose Course</option>
                <?php foreach($courses as $course){ ?>
                    <option value="<?=$course['id']?>" <?=$course_id == $course['id'] ? 'selected' : ''?>><?=$course['title']?></option>
                <?php } ?>    
            </select>
        </div>
        <div class="col-3">
            <select class="form-control select2" name="exam_id" id="exam_id">
                <option value="">Choose Exam</option>
            </select>
        </div>
        <div class="col-3">
            <input type="submit" class="btn btn-primary">
        </div>
    </div>
</form>
<div class="row">
    <div class="col-lg-12">
        <div class="card">
            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                        <tr>
                            <th style="width: 50px;">#</th>
                            <th style="width: 150px;">Name</th>
                            <th style="width: 150px;">Phone</th>
                            <th style="width: 150px;">Total Correct</th>
                            <th style="width: 150px;">Total Incorrect</th>
                            <th style="width: 150px;">Total Marked</th>
                            <th style="width: 150px;">Rank</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach($student_list as $key =>  $student) {?>
                            <tr>
                                <td><?=$key+1?></td>
                                <td><?=$student['name']?></td>
                                <td><?=$student['phone']?></td>
                                <td><?=$student['total_correct']?></td>
                                <td><?=$student['total_incorrect']?></td>
                                <td><?=$student['total_mark']?></td>
                                <td><?=$student['rank']?></td>
                            </tr>
                        <?php } ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div><!--end row-->

<script>
      function get_exam(course_id){
         $.ajax({
            url: '<?php echo base_url("Admin/Exam_report/get_exam_by_course_id"); ?>',
            type: 'POST',
            data: { course_id: course_id },
            success: function(data) {
                // Append HTML options to select element
                $('#exam_id').html(data);
            }
        });
    }
</script>

<script>

$(document).ready(function() {
    
    
    var exam_id = <?= isset($_GET['exam_id']) ? $_GET['exam_id'] : 'null'; ?>;
    var course_id  = $('#course_id').val();
    
         $.ajax({
            url: '<?php echo base_url("Admin/Exam_report/get_exam_by_course_id"); ?>',
            type: 'POST',
            data: { course_id: course_id,
                    exam_id: exam_id        
            },
            success: function(data) {
                // Append HTML options to select element
                $('#exam_id').html(data);
            }
        });
    });
</script>
