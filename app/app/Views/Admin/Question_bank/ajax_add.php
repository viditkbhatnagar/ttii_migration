<!-- Include FontAwesome CSS -->
<!--<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">-->
<!-- Include FontAwesome Icon Picker CSS -->
<!--<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/fontawesome-iconpicker/3.2.0/css/fontawesome-iconpicker.css" integrity="sha512-9yS+ck0i78HGDRkAdx+DR+7htzTZJliEsxQOoslJyrDoyHvtoHmEv/Tbq8bEdvws7s1AVeCjCMOIwgZTGPhySw==" crossorigin="anonymous" referrerpolicy="no-referrer" />-->
<!--<script src="https://cdnjs.cloudflare.com/ajax/libs/fontawesome-iconpicker/3.2.0/js/fontawesome-iconpicker.min.js" integrity="sha512-7dlzSK4Ulfm85ypS8/ya0xLf3NpXiML3s6HTLu4qDq7WiJWtLLyrXb9putdP3/1umwTmzIvhuu9EW7gHYSVtCQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>-->
<!--<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>-->

<form  action="<?=base_url('admin/question_bank/add')?>" method="post"  enctype="multipart/form-data">
    <input type="hidden" name="question_type" value="mcq">
    <input type="hidden" name="type" value="1">
    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    <div class="live-preview">
                        <div class="row gy-4">
                            <input type="hidden" name="exam_id" value="<?=$exam_id?>">
                            <div class="col-lg-6 p-2 d-none">
                                <div>
                                    <label for="name" class="form-label">Category<span class=" text-danger">*</span></label>
                                    <select class="form-control" name="category_id" onchange="get_course(this.value)">
                                        <option value="">Choose Category</option>
                                        <?php foreach($categories as $category){ ?>                                        
                                            <option value="<?=$category['id']?>" <?php if($category_id==$category['id']) echo "selected" ?>><?=$category['name']?></option>
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
                                            if($courses!=NULL){
                                                foreach($courses as $course){ 
                                        ?>                                        
                                            <option value="<?=$course['id']?>" <?php if(isset($course_id) && $course_id==$course['id']) echo "selected" ?>><?=$course['title']?></option>
                                        <?php } } ?>   
                                    </select>
                                </div>
                            </div>
                             
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="name" class="form-label">Lesson<span class=" text-danger">*</span></label>
                                    <select class="form-control" name="lesson_id" id="lesson_id" required>
                                        <option value="">Choose Lesson</option>
                                        <?php 
                                            if($lessons!=NULL){
                                                foreach($lessons as $lesson){ 
                                        ?>                                        
                                            <option value="<?=$lesson['id']?>" <?php if(isset($lesson_id) && $lesson_id==$lesson['id']) echo "selected" ?>><?=$lesson['title']?>?></option>
                                        <?php } } ?> 
                                    </select>
                                </div>
                            </div>
                            <!--<div class="col-lg-6 p-2">-->
                            <!--    <div>-->
                            <!--        <label for="name" class="form-label">Is Equation Type?</label>-->
                            <!--        <input type="checkbox" name="is_equation" value="1">-->
                            <!--    </div>-->
                            <!--</div>-->
                            <div class="col-lg-12 p-2 question-title">
                                <label for="title" class="form-label">Question Title</label>
                                <textarea class="form-textarea editor" name="title" id="editor1"></textarea>
                            </div>
                            <div class="col-lg-12 p-2 question-equation">
                                <div>
                                    <label for="name" class="form-label">Question equation</label>
                                    <input type="text" class="form-control" name="title_equation">
                                </div>
                            </div>
                            <div class="col-lg-12 p-2">
                                <div>
                                    <label for="name" class="form-label">Title Image</label>
                                    <input type="file" class="form-control" name="title_file" value="1">
                                </div>
                            </div>
                            <div class="col-lg-12 p-2">
                                <label for="title" class="form-label">Hint</label>
                                <textarea class="form-textarea editor" name="hint" id="editor2"></textarea>
                            </div>
                            <div class="col-lg-12 p-2">
                                <div>
                                    <label for="name" class="form-label">Hint Image</label>
                                    <input type="file" class="form-control" name="hint_file" value="1">
                                </div>
                            </div>
                            <div class="col-lg-12 p-2">
                                <div>
                                    <label for="name" class="form-label">Is Equation Type?</label>
                                    <input type="checkbox" name="is_equation_solution" value="1">
                                </div>
                            </div>
                            <div class="col-lg-12 p-2 solution">
                                <label for="title" class="form-label">Solution</label>
                                <textarea class="form-textarea editor" name="solution" id="editor3"></textarea>
                            </div>
                            <div class="col-lg-12 p-2 solution-equation">
                                <div>
                                    <label for="name" class="form-label">Solution equation</label>
                                    <input type="text" class="form-control" name="solution_equation" >
                                </div>
                            </div>
                            <div class="col-lg-12 p-2">
                                <div>
                                    <label for="name" class="form-label">Solution File</label>
                                    <input type="file" class="form-control" name="solution_file" >
                                </div>
                            </div>
                            <div class="col-lg-12">
                                <div class="row">
                                    <div class="col-10">
                                        <label for="name" class="form-label">Number of options</label>
                                        <input type="number" class="form-control" name="number_of_options" id="numOptions" required>
                                    </div>
                                    <div class="col-2">
                                        <button style="margin-top:27px" class="btn btn-primary" id="showInputsBtn">Ok</button>
                                    </div>
                                </div>
                            </div>
                            <div class="col-12 p-2" id="optionInputs"></div>

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
<script>
$(document).ready(function() {
    $('#showInputsBtn').click(function(event) {
        // Prevent default form submission
        event.preventDefault();
        
        var numOptions = parseInt($('#numOptions').val());
        if (!isNaN(numOptions) && numOptions > 0) {
            // Clear existing inputs if any
            $('#optionInputs').empty();
            // Generate new input fields
            for (var i = 1; i <= numOptions; i++) { 
                var optionId = 'option' + i;
                var id =  i;
                var checkboxId = 'correct' + i;
                $('#optionInputs').append('<div class="mb-3"><label for="' + optionId + '" class="form-label">Option ' + i + '</label><div class="form-check"><input class="form-check-input" type="checkbox" id="' + checkboxId + '" name="correct[]" value="' + id + '"><label class="form-check-label" for="' + checkboxId + '">Is this the answer?</label></div><textarea class="form-control ckeditor" id="' + optionId + '" name="option[]" value="' + id + '"></textarea></div>');
            }
            // Initialize CKEditor for dynamically generated textareas
            $('.ckeditor').each(function(index, element) {
                ClassicEditor.create(element)
                    .catch(error => {
                        console.error(error);
                    });
            });
        } else {                                                                                                                                
            alert('Please enter a valid number greater than zero.');
        }
    });
});
$(document).ready(function() {
    // Hide the question equation input initially
    $('.question-equation').hide();
    $('.solution-equation').hide();

    // Handle checkbox change event
    $('input[name="is_equation"]').change(function() {
        if($(this).is(':checked')) {
            // If the checkbox is checked, show the question equation input and hide the question title textarea
            $('.question-equation').show();
            $('.question-title').hide();
        } else {
            // If the checkbox is unchecked, hide the question equation input and show the question title textarea
            $('.question-equation').hide();
            $('.question-title').show();
        }
    });
    $('input[name="is_equation_solution"]').change(function() {
        if($(this).is(':checked')) {
            // If the checkbox is checked, show the question equation input and hide the question title textarea
            $('.solution-equation').show();
            $('.solution').hide();
        } else {
            // If the checkbox is unchecked, hide the question equation input and show the question title textarea
            $('.solution-equation').hide();
            $('.solution').show();
        }
    });
});

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