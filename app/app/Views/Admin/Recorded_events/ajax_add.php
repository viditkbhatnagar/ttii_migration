<form action="<?=base_url('admin/recorded_events/add')?>" enctype="multipart/form-data" method="post">
    <div class="row">
        
        <div class="col-lg-12 p-2">
            <div>
                <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
                <input type="text" class="form-control" id="title" name="title" required>
                <input type="hidden" class="form-control" id="event_id" name="event_id" value="<?=$event_id?>">
            </div>
        </div>
       
       
        

            
      
      
            <input type="hidden" name="lesson_provider" value="vimeo">
        
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
   



        
        <div class="col-lg-12 p-2">
            <div>
                <label for="summary" class="form-label">Description<span class="required text-danger">*</span></label>
                <textarea class="form-control" id="summary" name="summary" required></textarea>
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
        initSelect2(['#section_id','#video_id', '#lesson_type', '#lesson_provider', '#lesson_provider_for_mobile_application']);
        initTimepicker();
        setDefaultLessonType();
    });

    function setDefaultLessonType() {
        var lessonTypeSelect = document.getElementById('lesson_type');
        lessonTypeSelect.value = 'video-url';
        show_lesson_type_form('video-url');
    }

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
        var summaryField = document.getElementById('summary');
        var checker = param.split('-');
        var lesson_type = checker[0];
        if (lesson_type === "video") {
            $('#other').hide();
            $('#video').show();
        } else if (lesson_type === "other") {
            $('#video').hide();
            $('#other').show();
        } else {
            $('#video').hide();
            $('#other').hide();
        }
        
        if (lesson_type === 'other') {
            summaryField.removeAttribute('required');
        } else {
            summaryField.setAttribute('required', 'required');
        }
    }

    function check_video_provider(provider) {
        if (provider === 'youtube' || provider === 'vimeo') {
            $('#html5').hide();
            $('.youtube_vimeo').show();
        } else if(provider === 'html5') {
            $('.youtube_vimeo').hide();
            $('#html5').show();
        } else {
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
