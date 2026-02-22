


<form action="<?=base_url('admin/lesson_files/add')?>" enctype="multipart/form-data" method="post" id="lessonFileForm">
    <div class="row">
        <div class="col-lg-12 p-2">
            <div>
                <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
                <input type="text" class="form-control" id="title" name="title" required>
                <input type="hidden" class="form-control" id="lesson_id" name="lesson_id" value="<?=$lesson_id?>">
                <input type="hidden" class="form-control" id="topic_id" name="topic_id" value="<?=$topic_id?>">
                <input type="hidden" class="form-control" id="lesson_type" name="lesson_type" value="other-article">
            </div>
        </div>
             
          
         <div class="col-lg-12 p-2">
            <div>
                <label for="language_id" class="form-label">Languages</label>
                <select class="form-control select2" data-toggle="select2" name="language_id[]" id="language_id" multiple>
                    <?php foreach($languages as $val){ ?>
                    <option value="<?=$val['id']?>"><?=$val['title']?></option>
                    <?php } ?>
                </select>
            </div>
        </div>

       
        <div class="col-lg-12 p-2">
            <div>
                <label for="summary" class="form-label">Description<span class="required text-danger">*</span></label>
                <textarea class="form-control" id="editor" name="summary"></textarea>
            </div>
        </div>

        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>


<!-- <script type="text/javascript">
    $(document).ready(function() {
        
        $("#language_id").select2({
        dropdownParent: $("#small_modal")
    });
        // Initialize CKEditor
        ClassicEditor
            .create( document.querySelector('#editor') )
            .catch( error => {
                console.error( error );
            });

    });
    
    $(document).ready(function() {
    // Initialize Dropzone for attachment upload
    Dropzone.autoDiscover = false;
    var myDropzone = new Dropzone("#attachment-dropzone", {
        url: "<?= base_url('admin/lesson_files/upload_attachment') ?>",
        paramName: "file",
        maxFiles: 1,
        maxFilesize: 500, // MB
        acceptedFiles: "application/pdf,image/jpeg,image/png", // Allow PDFs, JPEG, and PNG images
        init: function() {
            this.on("success", function(file, response) {
                console.log("File uploaded successfully", response);
                // Update UI or handle response as needed
                $('<input>').attr({
                    type: 'hidden',
                    id: 'uploadedFileName',
                    name: 'uploadedFileName',
                    value: response.filename // Adjust based on your response structure
                }).appendTo('#lessonFileForm');
            });
        }
    });
});

</script> -->

<script type="text/javascript">
$(document).ready(function() {

    // Initialize Select2
    $("#language_id").select2({
        dropdownParent: $("#small_modal")
    });

    // Custom upload adapter for CKEditor
    class MyUploadAdapter {
        constructor(loader) {
            this.loader = loader;
        }

        // Start the upload process
        upload() {
            return this.loader.file
                .then(file => new Promise((resolve, reject) => {
                    const data = new FormData();
                    data.append('file', file);

                    $.ajax({
                        url: "<?= base_url('admin/lesson_files/upload_attachment') ?>",
                        type: 'POST',
                        data: data,
                        processData: false,
                        contentType: false,
                        dataType: 'json',
                        success: function(response) {
                            // Expect response like { status: true, url: "path/to/image.jpg" }
                            if (response.status && response.url) {
                                resolve({ default: response.url });
                            } else {
                                reject(response.message || 'Upload failed');
                            }
                        },
                        error: function(xhr, status, error) {
                            reject('Upload failed: ' + error);
                        }
                    });
                }));
        }

        // Optional: abort upload
        abort() {
            if (this.xhr) {
                this.xhr.abort();
            }
        }
    }

    // Plugin to use custom upload adapter
    function MyCustomUploadAdapterPlugin(editor) {
        editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
            return new MyUploadAdapter(loader);
        };
    }

    // Initialize CKEditor with upload plugin
    ClassicEditor
        .create(document.querySelector('#editor'), {
            extraPlugins: [MyCustomUploadAdapterPlugin]
        })
        .then(editor => {
            window.editor = editor;
        })
        .catch(error => {
            console.error('CKEditor initialization error:', error);
        });

});
</script>
