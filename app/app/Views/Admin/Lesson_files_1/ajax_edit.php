<?php
    if (isset($edit_data)){
        ?>
        <form action="<?=base_url('admin/lesson_files/edit/'.$edit_data['id'])?>" method="post"  enctype="multipart/form-data" id="lessonFileForm">
                <div class="row">
                    <div class="col-lg-12 p-2">
            <div>
                <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
                <input type="text" class="form-control" id="title" name="title" required value="<?=$edit_data['title']?>">

            </div>
        </div>
         <div class="col-12 form-group p-2">
            <label for="subject_id" class="form-label ">Lesson Type<span class="required text-danger">*</span></label>
            <select class="form-control select2" data-toggle="select2" name="lesson_type" id="lesson_type" required onchange="show_lesson_type_form(this.value)">
                <option value="">Select file Type</option>
                <option value="video-url" <?php if($edit_data["lesson_type"]=='video')echo "selected"; ?> >Video</option>
                <option value="other-pdf" <?php if($edit_data["attachment_type"]=='pdf')echo "selected"; ?> >PDF File</option>
                <option value="other-pdf" <?php if($edit_data["attachment_type"]=='article')echo "selected"; ?> >Article</option>

                <!--<option value="other-pdf" <?//php if($edit_data["attachment_type"]=='quiz')echo "selected"; ?> >Quiz</option>-->
            </select>
        </div>
        
        <div id="video" <?php if (strtolower($edit_data['video_type']) == 'vimeo' || strtolower($edit_data['video_type']) == 'youtube'): ?><?php else: ?> style="display: none;" <?php endif; ?>  >
            
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
                    <input type="text" id="video_url" name="video_url" class="form-control" placeholder="video url" onchange="checkURLValidity(this.value); cleanVimeoUrl();" value="<?=$edit_data['video_url']?>">
                </div>
            </div>
            
            <div class="col-lg-12 p-2 youtube_vimeo">
                <div>
                    <label for="duration" class="form-label">Duration<span class="required text-danger">*</span></label>
                    <input type="text" name ="duration" id="duration" class="form-control" pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}" value="00:00:00" placeholder="00:00:00" value="<?=$edit_data['duration']?>">
                </div>
            </div>
            
            <div class="col-lg-12 p-2">
                <div>
                    <label for="download_url" class="form-label">Download URL</label>
                    <input type="text" name="download_url" id="download_url" class="form-control" value="<?=$edit_data['download_url']?>">
                </div>
            </div>
            
            <div class="col-lg-12 p-2">
                <div>
                    <label for="thumbnail" class="form-label">Thumbnail<small>(Image size should be 979 x 551)</small></label>
                    <input type="file" class="form-control" id="thumbnail" name="thumbnail">
                </div>
            </div>
   
        </div>


        <div class="" id = "other" <?php if ($edit_data['attachment_type'] != 'pdf'): ?> style="display: none;" <?php endif; ?>>
            
           <div class="col-lg-12 p-2">
                    <label for="attachment" class="form-label">Attachment</label>
                    <!--<div class="dropzone" id="attachment-dropzone"></div>-->
                    <input type="file" class="form-control" id="uploadedFileName" name="uploadedFileName">
                </div>
           
        </div>
        
        <div class="col-lg-12 p-2">
            <div>
                <label for="summary" class="form-label">Description<span class="required text-danger">*</span></label>
                <textarea class="form-control" id="summary" name="summary" ><?=$edit_data['summary']?></textarea>
            </div>
        </div>

        
        <div class="col-lg-12 p-2">
            <div class="mt-3">
                <div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="on" name="free" id="defaultIndeterminateCheck1" <?php if($edit_data["free"]=='on')echo "checked"; ?>>
                        <label class="form-check-label" for="defaultIndeterminateCheck1">
                            Is this Free?
                        </label>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="col-12 p-2">
                    <button class="btn btn-success float-end btn-save" type="submit"><i class="ri-check-fill"></i>Save</button>
                </div>
        
            </div>
        </form>
        <?php
    }
?>

<script type="text/javascript">
    $(document).ready(function() {
        // Initialize CKEditor
        ClassicEditor
        .create( document.querySelector('#summary') )
        .catch( error => {
            console.error( error );
        });
    });
</script>

<script type="text/javascript">
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
    $(document).ready(function() {
        initSelect2(['#section_id','#video_id', '#lesson_type', '#lesson_provider', '#lesson_provider_for_mobile_application']);
        initTimepicker();
    });


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
        }else if (lesson_type === "other") {
            $('#video').hide();
            $('#other').show();
        }else {
            $('#video').hide();
            $('#other').hide();
        }
        
        // if (lesson_type === 'other') {
        //     summaryField.removeAttribute('required');
        // } else {
        //     summaryField.setAttribute('required', 'required');
        // }
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