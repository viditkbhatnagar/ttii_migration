<style>
    .image,
    .video_url {
        display: none;
    }
</style>
<form action="<?=base_url('admin/notification/add')?>" method="post" enctype="multipart/form-data">
    <div class="row">
        <div class="col-12 form-group p-2">
            <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" id="title" name="title" required>
        </div>
        <div class="col-12 form-group p-2">
            <label for="title" class="form-label">Description<span class="required text-danger">*</span></label>
           <textarea class="form-textarea editor" name="description" id="editor"></textarea>
        </div>
        <div class="col-12 form-group p-2">
            <label for="title" class="form-label">Course<span class="required text-danger">*</span></label>
           <select class="form-control select2" name="course_id" id="course_id">
               <option vlue="0">All course</option>
               <?php foreach($courses as $course){?>
                    <option value="<?=$course['id']?>"><?=$course['title']?></option>
                <?php }  ?>   
           </select>
        </div>
        <div class="col-12 form-group p-2 ">
            <label for="title" class="form-label">External Link</label>
            <input type="text" class="form-control" id="external_link" name="external_link"  >
        </div>
        <div class="col-12 form-group p-2 ">
            <label for="title" class="form-label">Show In App</label>
            <input type="checkbox" id="in_app" name="in_app"  >
        </div>
        <div class="col-12 form-group p-2 ">
            <label for="title" class="form-label">Send Push</label>
            <input type="checkbox" id="push" name="push"  >
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
        // Initialize Select2 on the select element
        // $('.select2').select2();
        
        
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