


<form action="<?=base_url('admin/lesson_files/add')?>" enctype="multipart/form-data" method="post" id="lessonFileForm">
    <div class="row">
        <div class="col-lg-12 p-2">
            <div>
                <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
                <input type="text" class="form-control" id="title" name="title" required>
                <input type="hidden" class="form-control" id="lesson_id" name="lesson_id" value="<?=$lesson_id?>">
                <input type="hidden" class="form-control" id="topic_id" name="topic_id" value="<?=$topic_id?>">

                <input type="hidden" class="form-control" id="lesson_type" name="lesson_type" value="other-quiz">
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
                <textarea class="form-control" id="editor" name="summary" value="
                    <ul>
                        <li>You must achieve a minimum score of 80% to pass. If you score below 80%, you can reattempt the quiz.</li>
                        <li>Each question has a 30-second time limit. Once the time expires, the quiz will automatically proceed to the next question, and your current answer (if any) will be recorded.</li>
                        <li>The quiz will automatically end after the last question, and your answers will be submitted.</li>
                        <li>Ensure you carefully read and answer each question before the time runs out.</li>
                    </ul>">
                    <ul>
                        <li>You must achieve a minimum score of 80% to pass. If you score below 80%, you can reattempt the quiz.</li>
                        <li>Each question has a 30-second time limit. Once the time expires, the quiz will automatically proceed to the next question, and your current answer (if any) will be recorded.</li>
                        <li>The quiz will automatically end after the last question, and your answers will be submitted.</li>
                        <li>Ensure you carefully read and answer each question before the time runs out.</li>
                    </ul>
                </textarea>
            </div>
        </div>


        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>


<script type="text/javascript">
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
            acceptedFiles: "application/pdf",
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
</script>
