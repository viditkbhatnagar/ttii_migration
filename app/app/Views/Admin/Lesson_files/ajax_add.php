


<form action="<?=base_url('admin/lesson_files/add')?>" enctype="multipart/form-data" method="post" id="lessonFileForm">
    <div class="row">
        <div class="col-lg-12 p-2">
            <div>
                <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
                <input type="text" class="form-control" id="title" name="title" required>
                <input type="hidden" class="form-control" id="lesson_id" name="lesson_id" value="<?=$lesson_id?>">
            </div>
        </div>
        
        <div class="col-12 form-group p-2">
            <label for="lesson_type" class="form-label ">Lesson Type<span class="required text-danger">*</span></label>
            <select class="form-control select2" data-toggle="select2" name="lesson_type" id="lesson_type" required onchange="show_lesson_type_form(this.value)">
                <option value="">Select file Type</option>
                <option value="video-url">Video</option>
                <option value="other-pdf">Study Note</option>
                <option value="other-quiz">Quiz</option>
            </select>
        </div>
        
        <div id="video" style="display: none;">
            
            <div class="col-12 form-group p-2">
                <label for="video_type" class="form-label ">Video Type<span class="required text-danger">*</span></label>
                <select class="form-control select2" data-toggle="select2" name="video_type" id="video_type">
                    <option value="">Select video Type</option>
                    <option value="recorded">Recorded Video</option>
                    <option value="practice_session">Practice Session Video</option>
                </select>
            </div>
            
            <div class="col-lg-12 p-2">
                <div>
                    <label for="lesson_provider" class="form-label">Lesson Provider<span class="required text-danger">*</span></label>
                    <select class="form-control" name="lesson_provider" id="lesson_provider">
                        <option value="vimeo">Vimeo</option>
                    </select>
                </div>
            </div>
        
            <div class="col-lg-12 p-2 youtube_vimeo">
                <div>
                    <label for="video_url" class="form-label">Video URL<span class="required text-danger">*</span></label>
                    <input type="text" id="video_url" name="video_url" class="form-control" placeholder="video url" onchange="checkURLValidity(this.value); cleanVimeoUrl();">
                </div>
            </div>
            
            <div class="col-lg-12 p-2 youtube_vimeo">
                <div>
                    <label for="duration" class="form-label">Duration<span class="required text-danger">*</span></label>
                    <input type="text" name ="duration" id="duration" class="form-control" pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}" value="00:00:00" placeholder="00:00:00">
                </div>
            </div>
            
            <div class="col-lg-12 p-2">
                <div>
                    <label for="download_url" class="form-label">Download URL</label>
                    <input type="text" name="download_url" id="download_url" class="form-control" value="">
                </div>
            </div>
            
            <div class="col-lg-12 p-2">
                <div>
                    <label for="thumbnail" class="form-label">Thumbnail<small>(Image size should be 979 x 551)</small></label>
                    <input type="file" class="form-control" id="thumbnail" name="thumbnail">
                </div>
            </div>
   
        </div>
        
        <div id="pdf" style="display: none;">
            <div class="col-lg-12 p-2 mt-1">
                <label for="attachment" class="form-label">Attachment</label>
                <div class="dropzone" id="attachment-dropzone"></div>
            </div>
            
        </div>


        <div id = "quiz" style="display: none;">
            <div class="col-12 form-group p-2">
                <label for="duration" class="form-label">Duration<span class="required text-danger">*</span></label>
                <input type="text" name ="duration" id="duration" class="form-control" pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}" value="00:00:00" placeholder="00:00:00">
            </div>
            <div class="col-12 form-group p-2">
                <label for="start_date" class="form-label">Mark<span class="required text-danger">*</span></label>
                <input type="number" class="form-control" id="" name="mark">
            </div>
            <div class="col-12 form-group p-2">
                <label for="start_date" class="form-label">Start Date<span class="required text-danger">*</span></label>
                <input type="date" class="form-control" id="start_date" name="from_date">
            </div>
            <div class="col-12 form-group p-2">
                <label for="start_date" class="form-label">Start Time<span class="required text-danger">*</span></label>
                <input type="time" class="form-control" id="start_date" name="from_time">
            </div>
            <div class="col-12 form-group p-2">
                <label for="end_date" class="form-label">End Date<span class="required text-danger">*</span></label>
                <input type="date" class="form-control" id="end_date" name="to_date">
            </div>
            <div class="col-12 form-group p-2">
                <label for="end_date" class="form-label">End Time<span class="required text-danger">*</span></label>
                <input type="time" class="form-control" id="end_date" name="to_time">
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


<script type="text/javascript">
    $(document).ready(function() {
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
<script type="text/javascript">

    function checkURLValidity(video_url) {
        var youtubePregMatch = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
        var vimeoPregMatch = /^(http\:\/\/|https\:\/\/)?(www\.)?(vimeo\.com\/)([0-9]+)$/;
        if (video_url.match(youtubePregMatch)) {
            return true;
        }
        else if (vimeoPregMatch.test(video_url)) {
            return true;
        }
        else {
            return false;
        }
    }


   
    function show_lesson_type_form(param) {
        // Hide all sections initially
        $('#video').hide();
        $('#pdf').hide();
        $('#quiz').hide();
    
        // $("#editor").prop('required', false);
        $("#video_type").prop('required', false);
        $("#mark").prop('required', false);
        $("#from_date").prop('required', false);
        $("#from_time").prop('required', false);
        $("#to_date").prop('required', false);
        $("#to_date").prop('required', false);
    
        var checker = param.split('-');
        var lesson_type = checker[0];
        var other_type = checker[1];
    
        if (lesson_type === "video") {
            $('#video').show();
            // Set required for video-specific fields
            // $("#editor").prop('required', true);
            $("#video_type").prop('required', true);
        } else if (lesson_type === "other" && other_type === "pdf") {
            $('#pdf').show();
            // No required fields for the PDF section
        } else if (lesson_type === "other" && other_type === "quiz") {
            $('#quiz').show();
            // Set required for quiz-specific fields
            // $("#editor").prop('required', true);
            $("#mark").prop('required', true);
            $("#from_date").prop('required', true);
            $("#from_time").prop('required', true);
            $("#to_date").prop('required', true);
            $("#to_date").prop('required', true);
        }
    }



    function check_video_provider(provider) {
        if (provider === 'youtube' || provider === 'vimeo') {
            $('#html5').hide();
            $('.youtube_vimeo').show();
        }else if(provider === 'html5'){
            $('.youtube_vimeo').hide();
            $('#html5').show();
        }else {
            $('.youtube_vimeo').hide();
            $('#html5').hide();
        }
    }
    
        const providerField = document.getElementById('lesson_provider');
      const videoField = document.getElementById('video_url');
  
      function cleanVimeoUrl() {
        const provider = providerField.value;
        let url = videoField.value;
  
        if (provider === 'vimeo') {
          const match = url.match(/(https:\/\/vimeo\.com\/\d+)/);
          if (match) {
            url = match[0];
            videoField.value = url;
          }
        }
      }
</script>

    