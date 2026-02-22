
<form action="<?=base_url('admin/lesson_files/add_items')?>" enctype="multipart/form-data" method="post" id="lessonFileForm">
    <div class="row">
        <div class="col-lg-12 p-2">
            <div>
                <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
                <input type="text" class="form-control" id="title" name="title" required>
                <input type="hidden" class="form-control" id="lesson_id" name="lesson_id" value="<?=$lesson_id?>">
                <input type="hidden" class="form-control" id="parent_file_id" name="parent_file_id" value="<?=$lesson_file_id?>">
                <input type="hidden" class="form-control" id="lesson_type" name="lesson_type" value="other-article">
            </div>
        </div>

      
             
        <div class="col-lg-12 p-2">
            <div>
                <label for="summary" class="form-label">Description<span class="required text-danger">*</span></label>
                <textarea class="form-control" id="editor" name="summary"></textarea>
            </div>
        </div>

        <div class="col-lg-12 p-2">
            <div class="mt-3">
                <div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="on" name="free" id="defaultIndeterminateCheck1">
                        <label class="form-check-label" for="defaultIndeterminateCheck1">
                            Is this Free?
                        </label>
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

<script>
       $(document).ready(function() {
        // Initialize CKEditor
        ClassicEditor
            .create( document.querySelector('#editor') )
            .catch( error => {
                console.error( error );
            });

    });
</script>
