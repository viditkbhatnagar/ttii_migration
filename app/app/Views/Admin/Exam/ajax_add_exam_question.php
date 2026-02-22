
<form  action="<?=base_url('admin/exam/add_exam_question')?>" method="post"  enctype="multipart/form-data">
    <!--<input type="hidden" name="question_type" value="mcq">-->
    <input type="hidden" name="type" value="1">
    <input type="hidden" name="exam_id" value="<?=$exam_id?>">
    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    <div class="live-preview">
                        <div class="row gy-4">
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="name" class="form-label">Category<span class=" text-danger">*</span></label>
                                    <select class="form-control" name="category_id" onchange="get_course(this.value)" required>
                                        <option value="">Choose Category</option>
                                         <?php foreach($categories as $category){ ?>    
                                            <?php $selected = $category_id == $category['id'] ? 'selected' : ""; ?>
                                            <option value="<?=$category['id']?>" <?=$selected?>><?=$category['name']?></option>
                                        <?php } ?>   
                                    </select>
                                </div>
                            </div>
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="name" class="form-label">Course<span class=" text-danger">*</span></label>
                                    <select class="form-control" name="course_id" id="course_id" onchange="get_lessons(this.value)" required>
                                        <option value="">Choose Course</option>
                                        <?php
                                            if($category_id>0){
                                                foreach($courses as $course){ 
                                        ?>    
                                        <?php $selected = $course_id == $course['id'] ? 'selected' : ""; ?>
                                            <option value="<?=$course['id']?>" <?=$selected?>><?=$course['title']?></option>
                                        <?php } } ?> 
                                    </select>
                                </div>
                            </div>
                            
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="name" class="form-label">Lesson</label>
                                    <select class="form-control" name="lesson_id" id="lesson_id">
                                        <option value="">Choose Lessons</option>
                                        <?php
                                            if($subject_id>0){
                                                foreach($lessons as $lesson){ 
                                        ?>    
                                        <?php $selected = $lesson_id == $lesson['id'] ? 'selected' : ""; ?>
                                            <option value="<?=$lesson['id']?>" <?=$selected?>><?=$lesson['title']?></option>
                                        <?php } } ?> 
                                    </select>
                                </div>
                            </div>
                            
                            <div class="col-lg-12 p-2">
                                <div>
                                    <label for="name" class="form-label">Question<span class=" text-danger">*</span></label>
                                    <input type="file" class="form-control" name="title_file" required
                                       accept=".jpeg, .png, .jpg">
                                </div>
                            </div>
                            
                            <div class="col-lg-12 p-2">
                                <div>
                                    <label for="name" class="form-label">Solution File</label>
                                    <input type="file" class="form-control" name="solution_file" >
                                </div>
                            </div>
                            
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="mark" class="form-label">Mark<span class=" text-danger">*</span></label>
                                    <input type="number" class="form-control" name="mark" value="4" required>
                                </div>
                            </div>
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="negative_mark" class="form-label">Negative Mark<span class=" text-danger">*</span></label>
                                    <input type="number" class="form-control" name="negative_mark" value="1" required>
                                </div>
                            </div>
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="type" class="form-label">Type<span class=" text-danger">*</span></label>
                                    <select class="form-control" name="type" id="type" required onchange="check_exam_type(this.value)">
                                        <option value="">Choose Type</option>
                                        <option value="1">MSQ</option>
                                        <option value="2">MCQ</option>
                                        <option value="3">NAT</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-lg-12 p-2" id="check_boxes">
                                <label for="name" class="form-label">Check the Correct Answers</label>
                                <div style="display:flex;gap:100px;">
                                    <div>
                                        <label for="name" class="form-label">1</label>
                                        <input class="form-check-input" type="checkbox" name="answer[]" value="1">
                                    </div>
                                    <div>
                                        <label for="name" class="form-label">2</label>
                                        <input class="form-check-input" type="checkbox" name="answer[]" value="2">
                                    </div>
                                    <div>
                                        <label for="name" class="form-label">3</label>
                                        <input class="form-check-input" type="checkbox" name="answer[]" value="3">
                                    </div>
                                    <div>
                                        <label for="name" class="form-label">4</label>
                                        <input class="form-check-input" type="checkbox" name="answer[]" value="4">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="col-lg-12 p-2" id="radio_button">
                                <label for="name" class="form-label">Choose the Correct Answer</label>
                                <div style="display:flex;gap:100px;">
                                    <div>
                                        <label for="name" class="form-label">1</label>
                                        <input class="form-radio-input" type="radio" name="mcq_answer[]" value="1">
                                    </div>
                                    <div>
                                        <label for="name" class="form-label">2</label>
                                        <input class="form-radio-input" type="radio" name="mcq_answer[]" value="2">
                                    </div>
                                    <div>
                                        <label for="name" class="form-label">3</label>
                                        <input class="form-radio-input" type="radio" name="mcq_answer[]" value="3">
                                    </div>
                                    <div>
                                        <label for="name" class="form-label">4</label>
                                        <input class="form-radio-input" type="radio" name="mcq_answer[]" value="4">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row p-2 input_fields">
                            <!--    <div>-->
                            <!--        <label for="name" class="form-label">Correct Answer</label>-->
                            <!--        <input type="text" class="form-control" name="nat_answer[]">-->
                            <!--    </div>-->
                            <!--</div>-->
                                <div class="col-lg-6 p-2 input_fields">
                                    <div>
                                        <label for="name" class="form-label">Range From</label>
                                        <input type="number" step="any" class="form-control" name="range_from">
                                    </div>
                                </div>
                                <div class="col-lg-6 p-2 input_fields">
                                    <div>
                                        <label for="name" class="form-label">Range To</label>
                                        <input type="number" step="any" class="form-control" name="range_to">
                                    </div>
                                </div>
                            </div>

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
        <!--end col-->
    </div>
</form>
<style>
    .form-label {
        font-size: 16px; /* Adjust the label size */
    }

    .form-check-input {
        width: 20px; /* Adjust the checkbox size */
        height: 20px; /* Adjust the checkbox size */
    }
</style>
<script>
$(document).ready(function() {
    $('.input_fields').hide();
    $('#check_boxes').hide();
    $('#radio_button').hide();

    $('#exam_type_selector').change(function() {
        var selectedType = $(this).val();
        check_exam_type(selectedType);
    });
});

function check_exam_type(type) {
    if (type == 3) {
        $('.input_fields').show();
        $('#radio_button').hide();
        $('#check_boxes').hide();
    } else if(type == 1) {
        $('#check_boxes').show();
        $('#radio_button').hide();
        $('.input_fields').hide();
    } else {
        $('#radio_button').show();
        $('#check_boxes').hide();
        $('.input_fields').hide();
    }
}

function get_course(category_id){
    
    $.ajax({
        url: '<?php echo base_url("Admin/Live_class/get_course"); ?>',
        type: 'POST',
        data: { category_id: category_id },
        success: function(data) {
            // Append HTML options to select element
            $('#course_id').html(data);
        }
    });    
    
}
function get_subjects(course_id){
    
    $.ajax({
        url: '<?php echo base_url("Admin/Question_bank/get_subjects"); ?>',
        type: 'POST',
        data: { course_id: course_id },
        success: function(data) {
            // Append HTML options to select element
            $('#subject_id').html(data);
        }
    });    
    
}
function get_lessons(course_id){
    
    $.ajax({
        url: '<?php echo base_url("Admin/Question_bank/get_lessons"); ?>',
        type: 'POST',
        data: { course_id: course_id },
        success: function(data) {
            // Append HTML options to select element
            $('#lesson_id').html(data);
        }
    });    
    
}
</script>
<!-- Include FontAwesome Icon Picker JS -->
<script>
$(document).ready(function() {
    // Initialize icon picker
    $('#icon-picker-input').iconpicker({
        iconset: 'fontawesome5', // Set the icon set to FontAwesome 5
        cols: 8, // Number of columns
        rows: 4, // Number of rows
        placement: 'bottom', // Placement of the icon picker relative to the input field
        align: 'left', // Alignment of the icon picker relative to the input field
    });
    
     $('#image').change(function() {
        var file = this.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var img = new Image();
                img.onload = function() {
                    var width = this.width;
                    var height = this.height;
                    if (width !== 400 || height !== 255) {
                        alert('Error: Image dimensions must be 400x255.');
                        // Reset the file input
                        $('#image').val('');
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
});
</script>
<script>
    $(document).ready(function() {
        // Initialize CKEditor
        ClassicEditor
            .create( document.querySelector( '#editor1' ) )
            .catch( error => {
                console.error( error );
            } );

        ClassicEditor
            .create( document.querySelector( '#editor2' ) )
            .catch( error => {
                console.error( error );
            } );
            
        ClassicEditor
            .create( document.querySelector( '#editor3' ) )
            .catch( error => {
                console.error( error );
            } );

        // Initialize other functionalities
        // ...
    });
</script>