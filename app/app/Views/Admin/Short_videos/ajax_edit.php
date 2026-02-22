<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/dropzone/5.9.3/min/dropzone.min.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/dropzone/5.9.3/min/dropzone.min.js"></script>

<form action="<?=base_url('admin/short_videos/edit/'.$edit_data['id'])?>" method="post" enctype="multipart/form-data">
    <div class="row">
        <div class="col-6 form-group p-2">
            <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" id="title" name="title" value="<?=$edit_data['title']?>" >
        </div>

        <div class="col-6 form-group p-2">
            <label for="course_id" class="form-label">Course<span class="required text-danger">*</span></label>
           <select class="form-control select2" name="course_id" id="course_id">
               <option value="0">All course</option>
               <?php foreach($course as $item){?>
                    <option value="<?=$item['id']?>" <?=($edit_data['course_id']==$item['id']) ? 'selected' : ''?>><?=$item['title']?></option>
                <?php } ?>    
           </select>
        </div>

        <div class="col-12 form-group p-2 image">
            <label for="thumbnail" class="form-label">Thumbnail</label>
            <input type="file" class="form-control" id="thumbnail" name="image">
        </div>
        
        
         <?php
         if(!empty($edit_data['uploaded_video']))
         { ?>
            <div class="col-6 form-group p-2">
                <video id="videoPlayer" width="300" height="300" controls>
                    <source src="<?=base_url(get_file($edit_data['uploaded_video']))?>" type="video/mp4">
                </video>
            </div>
        <?php
        }
        ?>
                            

        <div class="col-6 form-group p-2">
            <label for="videoUploadDropzone" class="form-label">Upload New Video</label>
            <div id="videoUploadDropzone" class="dropzone"></div>
        </div>

        <input type="hidden" id="uploaded_video" name="uploaded_video" value="<?=$edit_data['uploaded_video']?>">
        
        
         <div class="col-lg-12 p-2">
            <div class="mt-3">
                <div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="1" name="set_as_popular" id="defaultIndeterminateCheck1"  <?php if($edit_data["set_as_popular"]==1)echo "checked"; ?>>
                        <label class="form-check-label" for="defaultIndeterminateCheck1">
                            Set as Popular
                        </label>
                    </div>
                </div>
            </div>
        </div>
        
         <div class="col-lg-12 p-2">
            <div class="mt-3">
                <div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="1" name="set_as_trending" id="defaultIndeterminateCheck2"  <?php if($edit_data["set_as_trending"]==1)echo "checked"; ?>>
                        <label class="form-check-label" for="defaultIndeterminateCheck2">
                            Set as Trending
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
        $("#course_id").select2({
            dropdownParent: $("#ajax_modal")
        });
    });
    
    const videoDropzone = new Dropzone("#videoUploadDropzone", {
        url: "<?=base_url('admin/short_videos/upload_video')?>", // Your server-side upload handler
        maxFilesize: 10, // Max file size in MB
        acceptedFiles: "video/*", // Only allow video files
        addRemoveLinks: true, // Show remove button
        dictRemoveFile: "Remove", // Customize remove button text (optional)
        success: function (file, response) {
            console.log("File uploaded successfully:", response);
            $("#uploaded_video").val(response.filePath);
    
    
        },
        removedfile: function (file) {
            // Remove the hidden input field on file removal
            const inputField = document.querySelector(`#uploaded_video_${file.upload.uuid}`);
            if (inputField) {
                inputField.remove();
            }
    
            // Optionally, send an AJAX request to remove the file from the server
            if (file.serverFilePath) {
                fetch("<?=base_url('admin/short_videos/remove_video')?>", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ filePath: file.serverFilePath })
                })
                .then(response => response.json())
                .then(data => {
                    console.log("File removed from server:", data);
                })
                .catch(err => {
                    console.error("Error removing file:", err);
                });
            }
    
            // Remove the preview from Dropzone
            file.previewElement.remove();
        }
    });





</script>