

<form action="<?=base_url('admin/lesson_files/add')?>" enctype="multipart/form-data" method="post" id="lessonFileForm">
    <div class="row">
        <div class="col-lg-12 p-2">
            <div>
                <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
                <input type="text" class="form-control" id="title" name="title" required>
                <input type="hidden" class="form-control" id="lesson_id" name="lesson_id" value="<?=$lesson_id?>">
                <input type="hidden" class="form-control" id="lesson_type" name="lesson_type" value="<?=$lesson_type?>">
            </div>
        </div>
        
        <!--<div class="col-12 form-group p-2">-->
        <!--    <label for="lesson_type" class="form-label ">Lesson Type<span class="required text-danger">*</span></label>-->
        <!--    <select class="form-control select2" data-toggle="select2" name="lesson_type" id="lesson_type" required onchange="show_lesson_type_form(this.value)">-->
        <!--        <option value="">Select file Type</option>-->
        <!--        <option value="video-url">Video</option>-->
        <!--        <option value="other-pdf">PDF</option>-->
        <!--        <option value="other-quiz">Quiz</option>-->
        <!--    </select>-->
        <!--</div>-->
        
        <div id="video" style="display: none;">
            
            <div class="col-12 form-group p-2 d-none">
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
                    <select class="form-control" name="lesson_provider" id="lesson_provider"  onchange="check_video_provider(this.value)">
                        <option value="vimeo">Vimeo</option>
                        <option value="youtube">Youtube</option>
                        <option value="html5">MP4</option>
                    </select>
                </div>
            </div>
            
            <div id="html_file_div" style="display: none;">
                <div class="col-lg-12 p-2">
                    <div>
                        <label for="html_file" class="form-label">Upload HTML File<span class="required text-danger">*</span></label>
                        <input type="file" class="form-control" id="html_file" name="html_file" accept=".html">
                    </div>
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
            
            <div class="col-lg-12 p-2 youtube_vimeo">
                <div>
                    <label for="download_url" class="form-label">Download URL</label>
                    <input type="text" name="download_url" id="download_url" class="form-control" value="">
                </div>
            </div>
            
           
   
        </div>
        
        <div id="pdf" style="display: none;">
            <div class="col-lg-12 p-2 mt-1">
                <label for="attachment" class="form-label">Attachment</label>
                    <input type="file" class="form-control" id="attachment" name="attachment">
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


<script type="text/javascript">
    $(document).ready(function() {
        // Initialize CKEditor
        ClassicEditor
            .create( document.querySelector('#editor') )
            .catch( error => {
                console.error( error );
            });
            
        var LessonType = $("#lesson_type").val(); // Assuming $lesson_type is available
        console.log(LessonType);
        if (LessonType) {
            show_lesson_type_form(LessonType);
        }

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
        // $("#video_type").prop('required', false);
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
            // $("#video_type").prop('required', true);
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
        if (provider === 'youtube' || provider === 'vimeo' || provider === 'html5') {
            $('#html5').hide();
            $('.youtube_vimeo').show();
            $("#html_file_div").hide();
        }
        else {
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

    