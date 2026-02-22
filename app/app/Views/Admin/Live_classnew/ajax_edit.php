<!-- Include FontAwesome CSS -->
<!--<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">-->
<!-- Include FontAwesome Icon Picker CSS -->
<!--<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/fontawesome-iconpicker/3.2.0/css/fontawesome-iconpicker.css" integrity="sha512-9yS+ck0i78HGDRkAdx+DR+7htzTZJliEsxQOoslJyrDoyHvtoHmEv/Tbq8bEdvws7s1AVeCjCMOIwgZTGPhySw==" crossorigin="anonymous" referrerpolicy="no-referrer" />-->
<!--<script src="https://cdnjs.cloudflare.com/ajax/libs/fontawesome-iconpicker/3.2.0/js/fontawesome-iconpicker.min.js" integrity="sha512-7dlzSK4Ulfm85ypS8/ya0xLf3NpXiML3s6HTLu4qDq7WiJWtLLyrXb9putdP3/1umwTmzIvhuu9EW7gHYSVtCQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>-->
<!--<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>-->

<form autocomplete="off" action="<?=base_url('admin/live_class/edit/'.$edit_data['id'])?>" method="post" enctype="multipart/form-data">
    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    <div class="live-preview">
                        <div class="row gy-4">
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="code" class="form-label">Title<span class="required text-danger">*</span></label>
                                    <input type="text" class="form-control" id="title" name="title" value="<?=$edit_data['title']?>" required>
                                </div>
                            </div> 
                           
                           
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="name" class="form-label">Course<span class="required text-danger">*</span></label>
                                    <select class="form-control" name="course_id" id="course_id" onchange="get_instructor(this.value)" required>
                                        <option value="">Choose Course</option>
                                        <?php foreach($courses as $course){ ?>                                        
                                            <option value="<?=$course['id']?>" <?=($edit_data['course_id']==$course['id']) ? 'selected' : '' ;?>><?=$course['title']?></option>
                                        <?php } ?> 
                                    </select>
                                </div>
                            </div>
                            
                             <div class="col-lg-6 p-2">
                                <div>
                                    <label for="instructor_id" class="form-label">Instructor</label>
                                    <select class="form-control" name="instructor_id" id="instructor_id">
                                        <option value="0">Choose Instructor</option>
                                    </select>
                                </div>
                            </div>
                          
                          
                          
                          
                         
                         
                            <div class="col-lg-6">
                                <div class="mt-3">
                                    <label class="form-label mb-0">From Date<span class="required text-danger">*</span></label>
                                    <input type="date" class="form-control" name="fromDate" value="<?=$edit_data['fromDate']?>" required>
                                </div>
                            </div>
                            <div class="col-lg-6">
                                <div class="mt-3">
                                    <label class="form-label mb-0">To Date<span class="required text-danger">*</span></label>
                                    <input type="date" class="form-control" name="toDate" value="<?=$edit_data['toDate']?>" required>
                                </div>
                            </div>
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="code" class="form-label">From Time<span class="required text-danger">*</span></label>
                                    <input type="time" class="form-control select2" name="fromTime" id="fromTime" value="<?=$edit_data['fromTime']?>" required>
                                </div>
                            </div>
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="code" class="form-label">To Time<span class="required text-danger">*</span></label>
                                    <input type="time" class="form-control select2" name="toTime" id="toTime" value="<?=$edit_data['toTime']?>" required>
                                </div>
                            </div>
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="" class="form-label">Zoom ID<span class="required text-danger">*</span></label>
                                    <input type="text" class="form-control select2" name="zoom_id" id="zoom_id" value="<?=$edit_data['zoom_id']?>" required>
                                </div>
                            </div>
                            <div class="col-lg-6 p-2">
                                <div>
                                    <label for="" class="form-label">Password<span class="required text-danger">*</span></label>
                                    <input type="text" class="form-control select2" name="password" id="password" value="<?=$edit_data['password']?>" required>
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
<script>

$(document).ready(function() {
      $("#category_id").select2({
        dropdownParent: $("#ajax_modal")
      });
      
      $("#course_id").select2({
        dropdownParent: $("#ajax_modal")
      });
      
      
      $("#package_id").select2({
        dropdownParent: $("#ajax_modal")
      });
      
      
      $("#live_type").select2({
        dropdownParent: $("#ajax_modal")
      });
      
      $("#student_id").select2({
        dropdownParent: $("#ajax_modal")
      });
      
      $("#role_id").select2({
        dropdownParent: $("#ajax_modal")
      });
      get_course_type($('#live_type').val());

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
    function get_package(course_id){
        
     $.ajax({
                url: '<?php echo base_url("Admin/Live_class/get_package"); ?>',
                type: 'POST',
                data: { course_id: course_id },
                success: function(data) {
                    // Append HTML options to select element
                    $('#package_id').html(data);
                }
            });    
        
    }
    
      function get_instructor(course_id){
        
     $.ajax({
                url: '<?php echo base_url("Admin/Live_class/get_instructor"); ?>',
                type: 'POST',
                data: { course_id: course_id },
                success: function(data) {
                    // Append HTML options to select element
                    $('#instructor_id').html(data);
                }
            });    
        
    }
    
    
    function get_course_type(course_type){
        
        if(course_type == 1 || course_type == ''){
            $("#student_div").hide();
        }else{
            $("#student_div").show();
        }
        
    }
</script>



<!-- Include FontAwesome Icon Picker JS -->
<script>
$(document).ready(function() {
    
    var live_type = <?=$edit_data['live_type']?>
    
    if(live_type==1){
            $("#student_div").hide();
        }else{
            $("#student_div").show();
        }
    
    var category_id = <?=$edit_data['category_id']?>;
    var selected_course_id = <?=$edit_data['course_id']?>;
    
    $.ajax({
        url: '<?php echo base_url("Admin/Live_class/get_course"); ?>',
        type: 'POST',
        data: { 
            category_id: category_id,
            selected_course_id: selected_course_id  // Pass the selected course ID
        },
        success: function(data) {
            // Append HTML options to select element
            $('#course_id').html(data);
        }
    });
    
    
    
    var course_id = <?=$edit_data['course_id']?>;
    var selected_instructor_id = <?=$edit_data['instructor_id']?>;

    $.ajax({
        url: '<?php echo base_url("Admin/Live_class/get_instructor"); ?>',
        type: 'POST',
        data: { 
            course_id: course_id,
            selected_instructor_id: selected_instructor_id  // Pass the selected package ID
        },
        success: function(data) {
            // Append HTML options to select element
            $('#instructor_id').html(data);
        }
    });
   
        
    

    

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
