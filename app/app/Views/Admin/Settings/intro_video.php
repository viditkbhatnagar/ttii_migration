<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/dropzone/5.9.3/min/dropzone.min.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/dropzone/5.9.3/min/dropzone.min.js"></script>


<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('app/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>

        </div>
    </div>
</div>
<div class="row">
    <div class="col-lg-12">
        <div class="card">
            <div class="card-body">
                <form action="<?=base_url('admin/settings/intro_video')?>" enctype="multipart/form-data" method="post">
                    <div>
                        
                       <div class="row">
                           <?php
                           if(!empty($intro_video))
                           { ?>
                           
                               <div class="col-6 form-group p-2">
                                   <video id="videoPlayer" width="400" height="400" controls>
                                    <source src="<?=base_url(get_file($intro_video['value']))?>" type="video/mp4">
                                    
                                </video>
                                </div>
                            <?php
                           }
                           ?>
                            
                            
                            <div class="col-6 form-group p-2">
                                <label for="videoUploadDropzone" class="form-label">Upload New Video</label>
                                <div id="videoUploadDropzone" class="dropzone"></div>
                            </div>
                            <input type="hidden" id="uploaded_video" name="uploaded_video" >
                          
                          
                            
                         <div class="col-12 p-2">
                            <button class="btn btn-success float-end btn-save" type="submit">
                                <i class="ri-check-fill"></i> Save
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div><!--end row-->

















<script>

    const videoDropzone = new Dropzone("#videoUploadDropzone", {
        url: "<?=base_url('admin/settings/upload_video')?>", // Your server-side upload handler
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
                fetch("<?=base_url('admin/settings/remove_video')?>", {
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