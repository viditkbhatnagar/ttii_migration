<form autocomplete="off" action="<?= base_url('centre/wallet/add') ?>" method="post" enctype="multipart/form-data" id="fundForm">
    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    <div class="live-preview">
                        <div class="row">
                            <!-- Title -->
                            <div class="col-lg-6 p-2">
                                <label for="title" class="form-label">Transaction Amount<span class="required text-danger">*</span></label>
                                <input type="number" class="form-control" id="amount" name="amount" required>
                            </div>
                            
                            <div class="col-lg-6 p-2">
                                <label for="course_id" class="form-label">Transaction Date<span class="required text-danger">*</span></label>
                                <input type="date" class="form-control" id="date" name="date" required>
                            </div>
                            
                            
                            <!-- Description -->
                            <div class="col-lg-12 p-2">
                                <label for="description" class="form-label">Additional Information<span class="required text-danger">*</span></label>
                                <textarea class="form-control" id="description" name="description" rows="4"></textarea>
                            </div>

                            <!-- Total marks -->
                            <div class="col-lg-12 p-2">
                                <label for="transaction_no" class="form-label">Transaction Number<span class="required text-info">(optional)</span></label>
                                <input type="text" class="form-control" id="transaction_no" name="transaction_no" >
                            </div>
                           
                            
                            <div class="col-lg-12 p-2 mt-1">
                                <label for="attachment" class="form-label">Attachment<span class="required text-info">(optional)</span></label> 
                                <div class="dropzone" id="attachment-dropzone"></div>
                            </div>
                                                
                            

                            <!-- Save Button -->
                            <div class="col-12 p-2">
                                <button class="btn btn-success float-end btn-save" type="submit">
                                    <i class="ri-save-line"></i> Send Request
                                </button>
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
    
    $(document).ready(function() {
        // Initialize Dropzone for attachment upload
        Dropzone.autoDiscover = false;
        var myDropzone = new Dropzone("#attachment-dropzone", {
            url: "<?= base_url('centre/wallet/upload_attachment') ?>",
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
                    }).appendTo('#fundForm');
                });
            }
        });
    });
</script>
