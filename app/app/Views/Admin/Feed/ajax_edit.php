<form action="<?=base_url('admin/feed/edit/'.$edit_data['id'])?>" method="post" enctype="multipart/form-data">
    <div class="row">
        <div class="col-6 form-group p-2">
            <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" id="title" name="title" value="<?=$edit_data['title']?>" >
        </div>
        
        
        <div class="col-6 form-group p-2 image">
            <label for="title" class="form-label">Image</label>
            <input type="file" class="form-control" id="" name="image" >
        </div>
        
        <div class="col-6 form-group p-2">
            <label for="title" class="form-label">Course<span class="required text-danger">*</span></label>
           <select class="form-control select2" name="course_id" id="course_id">
               <option value="0">All course</option>
               <?php foreach($course as $item){?>
                    <option value="<?=$item['id']?>" <?=($edit_data['course_id']==$item['id']) ? 'selected' : ''?>><?=$item['title']?></option>
                <?php }  ?>    
           </select>
        </div>
       
         <div class="col-lg-6 p-2">
                                <div>
                                    <label for="instructor_id" class="form-label">Instructor</label>
                                    <select class="form-control" name="instructor_id" id="instructor_id">
                                        <option value="0">Choose Instructor</option>
                                    </select>
                                </div>
                            </div>
                          
                          
        <div class="col-12 form-group p-2">
            <label for="title" class="form-label">Description<span class="required text-danger">*</span></label>
           <textarea class="form-textarea editor" name="content" id="editor"><?=$edit_data['content']?></textarea>
        </div>
        
        
        
       
       
        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>
  
<script>
    $(document).ready(function() {
        $("#feed_category_id").select2({
            dropdownParent: $("#ajax_modal")
        });
    });

    $(document).ready(function() {
        $("#course_id").select2({
            dropdownParent: $("#ajax_modal")
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
   
    });
    
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
    

    // $(document).ready(function() {
    //     $("#feed_type").select2({
    //         dropdownParent: $("#ajax_modal")
    //     });
    // });




    function get_type(type){
    
        if(type==2){
            $('.image').hide();
            $('.video_url').show();
        }else{
            $('.video_url').hide();
            $('.image').show();
        }
    }

    $(document).ready(function() {
            var initialFeedType = $('#feed_type').val();
            get_type(initialFeedType);
        });
    
    $(document).ready(function() {
        // Initialize CKEditor
        ClassicEditor
            .create( document.querySelector( '#editor' ) )
            .catch( error => {
                console.error( error );
            } );
    });

</script>