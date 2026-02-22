<form autocomplete="off" action="<?= base_url('admin/assignment/add') ?>" method="post" enctype="multipart/form-data" id="assignmentForm">
    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    <div class="live-preview">
                        <div class="row">
                            <!-- Title -->
                            <input type="hidden" name="cohort_id" value=""> 
                            <div class="col-lg-6 p-2">
                                <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
                                <input type="text" class="form-control" id="title" name="title" required>
                            </div>
                            
                            <div class="col-lg-6 p-2">
                                <label for="course_id" class="form-label">Course<span class="required text-danger">*</span></label>
                                <select class="form-control" name="course_id">
                                    <option value="">Choose Course</option>
                                    <?php foreach($course as $val){ ?>
                                        <option value="<?=$val['id']?>"><?=$val['title']?></option>
                                    <?php } ?>    
                                </select>
                            </div>
                            
                            
                            <!-- Description -->
                            <div class="col-lg-12 p-2">
                                <label for="description" class="form-label">Description</label>
                                <textarea class="form-control" id="description" name="description" rows="4"></textarea>
                            </div>

                           
                            <!-- From Time -->
                            <div class="col-lg-4 p-2">
                                <label for="due_date" class="form-label">Date<span class="required text-danger">*</span></label>
                                <input type="date" class="form-control" id="due_date" name="due_date" required>
                            </div>

                            <!-- From Time -->
                            <div class="col-lg-4 p-2">
                                <label for="from_time" class="form-label">From Time<span class="required text-danger">*</span></label>
                                <input type="time" class="form-control" id="from_time" name="from_time" required>
                            </div>

                            <!-- To Time -->
                            <div class="col-lg-4 p-2">
                                <label for="to_time" class="form-label">To Time<span class="required text-danger">*</span></label>
                                <input type="time" class="form-control" id="to_time" name="to_time" required>
                            </div>
                            
                            <div class="col-lg-12 p-2 mt-1">
                                <label for="attachment" class="form-label">Attachment</label>
                                <div class="dropzone" id="attachment-dropzone"></div>
                            </div>
                                                
                            <div class="col-12 p-2 form-group">
                                <label for="instruction" class="form-label">Instructions</label>
                                <textarea class="form-textarea editor" name="instruction" id="editor1"></textarea>
                            </div>
                            

                            <div class="d-flex align-items-start gap-3 mt-4">
                                <button type="button" id="activitiesSubmitBtn" class="btn btn-success btn-label right ms-auto nexttab"><i class="ri-arrow-right-line label-icon align-middle fs-16 ms-2"></i>Save & Next</button>
                            </div>
                        </div>
                        <!--end row-->
                    </div>
                </div>
            </div>
        </div>
    </div>
</form>

<script>
    $(document).ready(function() {
        // Initialize CKEditor
        ClassicEditor
            .create( document.querySelector( '#editor1' ) )
            .catch( error => {
                console.error( error );
            });

    });
    
    Dropzone.autoDiscover = false;
    $(document).ready(function() {
        // Initialize Dropzone for attachment upload
        var myDropzone = new Dropzone("#attachment-dropzone", {
            url: "<//?= base_url('admin/assignment/upload_attachment') ?>",
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
                    }).appendTo('#assignmentForm');
                });
            }
        });
    });
</script>
