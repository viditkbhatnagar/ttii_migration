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
            
            <div class="col-lg-12 p-2">
                <div>
                    <label for="language_id" class="form-label">Languages</label>
                    <select class="form-control select2" data-toggle="select2" name="language_id[]" id="language_id" multiple>
                        <?php 
                        
                        $selectedLanguages = json_decode($edit_data['languages'], true) ?? []; 
                        foreach($languages as $val)
                        {
                            $selected = in_array($val['id'], $selectedLanguages) ? 'selected' : ''; 

                        ?>
                        <option value="<?=$val['id']?>" <?=$selected?>><?=$val['title']?></option>
                        <?php } ?>
                    </select>
                </div>
            </div>

            <?php if($edit_data["attachment_type"]=='url'){ ?>
                <input type="hidden" class="form-control" id="lesson_type" name="lesson_type" value="video-url">
            <?php } else if($edit_data["attachment_type"]=='pdf'){ ?>
                <input type="hidden" class="form-control" id="lesson_type" name="lesson_type" value="other-pdf">
            <?php } else if($edit_data["attachment_type"]=='audio'){ ?>
                <input type="hidden" class="form-control" id="lesson_type" name="lesson_type" value="other-audio">
            <?php } else if($edit_data["attachment_type"]=='quiz'){ ?>
                <input type="hidden" class="form-control" id="lesson_type" name="lesson_type" value="other-quiz">
            <?php } else if($edit_data["attachment_type"]=='article'){ ?>
                <input type="hidden" class="form-control" id="lesson_type" name="lesson_type" value="other-article">
            <?php }
            ?>
            
            <input type="hidden" class="form-control" id="video_type" name="video_type" value="0">

    
            <div id="video"  <?php if ($edit_data['attachment_type'] != 'url'): ?> style="display: none;" <?php endif; ?>>

                
                <div class="col-lg-12 p-2">
                    <div>
                        <label for="lesson_provider" class="form-label">Lesson Provider<span class="required text-danger">*</span></label>
                        <select class="form-control" name="lesson_provider" id="lesson_provider">
                            <option value="vimeo" <?php if($edit_data['lesson_provider'] == 'vimeo') echo "selected";?>>Vimeo</option>
                            <option value="youtube" <?php if($edit_data['lesson_provider'] == 'youtube') echo "selected";?>>Youtube</option>

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
                        <input type="text" name ="duration" id="duration" class="form-control" pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}" value="<?=$edit_data['duration']?>">
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
    
    
            <div  id = "pdf" <?php if ($edit_data['attachment_type'] != 'pdf'): ?> style="display: none;" <?php endif; ?>>
               <div class="col-lg-12 p-2">
                    <label for="attachment" class="form-label">Attachment</label>
                    <div class="dropzone" id="attachment-dropzone"></div>
                </div>
            </div>
            
            
            <div id = "audio" <?php if ($edit_data['attachment_type'] != 'audio'): ?> style="display: none;" <?php endif; ?>>
                <div class="col-lg-12 p-2 mt-1">
                    <label for="audio" class="form-label">Audio</label>
                    <input type="file" class="form-control" id="audio_file" name="audio_file"  accept="audio/*">
                </div>
            </div>
            
            
            <div class="col-lg-12 p-2">
                <div>
                    <label for="summary" class="form-label">Description<span class="required text-danger">*</span></label>
                    <textarea class="form-control" id="editor" name="summary"><?=$edit_data['summary']?></textarea>
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

<script type="text/javascript">
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
        // Hide all sections initially
        $('#video').hide();
        $('#pdf').hide();
        $('#audio').hide();
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
        } else if (lesson_type === "other" && other_type === "audio") {
            $('#audio').show();
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
<script>
const YOUTUBE_API_KEY = "<?=esc((string) env('YOUTUBE_API_KEY'), 'js')?>";

document.getElementById('video_url').addEventListener('change', function () {
    const videoUrl = this.value.trim();
    const provider = document.getElementById('lesson_provider').value;

    if (provider === 'vimeo' && videoUrl.includes("vimeo.com")) {
        fetchVimeoDuration(videoUrl);
    } else if (provider === 'youtube' && (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be"))) {
        const videoId = extractYouTubeVideoId(videoUrl);
        if (videoId) {
            fetchYouTubeDuration(videoId);
        } else {
            alert("Invalid YouTube URL.");
        }
    }
});

function fetchVimeoDuration(videoUrl) {
    const oEmbedApi = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}`;

    fetch(oEmbedApi)
        .then(res => res.json())
        .then(data => {
            const seconds = data.duration;
            document.getElementById('duration').value = formatSecondsToHHMMSS(seconds);
        })
        .catch(err => {
            console.error(err);
            alert("Failed to fetch Vimeo duration.");
        });
}

function fetchYouTubeDuration(videoId) {
    if (!YOUTUBE_API_KEY) {
        alert("YouTube API key is not configured.");
        return;
    }

    const apiURL = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${YOUTUBE_API_KEY}`;

    fetch(apiURL)
        .then(res => res.json())
        .then(data => {
            if (data.items.length > 0) {
                const isoDuration = data.items[0].contentDetails.duration;
                const seconds = convertISO8601DurationToSeconds(isoDuration);
                document.getElementById('duration').value = formatSecondsToHHMMSS(seconds);
            } else {
                alert("YouTube video not found.");
            }
        })
        .catch(err => {
            console.error(err);
            alert("Failed to fetch YouTube duration.");
        });
}

function extractYouTubeVideoId(url) {
    const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]{11}).*/;
    const match = url.match(regExp);
    return match ? match[1] : null;
}

function convertISO8601DurationToSeconds(iso) {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
}

function formatSecondsToHHMMSS(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}
</script>
