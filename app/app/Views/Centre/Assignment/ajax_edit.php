<form autocomplete="off" action="<?= base_url('admin/assignment/edit/'.$edit_data['id']) ?>" method="post" enctype="multipart/form-data" id="assignmentForm">
    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    <div class="live-preview">
                        <div class="row">
                            <!-- Title -->
                            <div class="col-lg-6 p-2">
                                <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
                                <input type="text" class="form-control" id="title" name="title"  value="<?=$edit_data['title']?>" required>
                            </div>
                            
                            <div class="col-lg-6 p-2">
                                <label for="course_id" class="form-label">Course<span class="required text-danger">*</span></label>
                                <select class="form-control" name="course_id">
                                    <option value="">Choose Course</option>
                                    <?php foreach($course as $val){ ?>
                                        <option value="<?=$val['id']?>" <?=$edit_data['course_id']==$val['id'] ? 'selected' : '' ?>><?=$val['title']?></option>
                                    <?php } ?>    
                                </select>
                            </div>

                            <!-- Description -->
                            <div class="col-lg-12 p-2">
                                <label for="description" class="form-label">Description</label>
                                <textarea class="form-control" id="description" name="description" rows="4"><?= $edit_data['description'] ?></textarea>
                            </div>

                            <!-- Total marks -->
                            <div class="col-lg-12 p-2">
                                <label for="total_marks" class="form-label">Total Marks</label>
                                <input type="text" class="form-control" id="total_marks" name="total_marks" value="<?=$edit_data['total_marks']?>" required>
                            </div>
                       

                            <!-- Event Date -->
                            <div class="col-lg-4 p-2">
                                <label for="due_date" class="form-label">Date<span class="required text-danger">*</span></label>
                                <input type="date" class="form-control" id="due_date" name="due_date" required value="<?=$edit_data['due_date']?>">
                            </div>

                            <!-- From Time -->
                            <div class="col-lg-4 p-2">
                                <label for="from_time" class="form-label">From Time<span class="required text-danger">*</span></label>
                                <input type="time" class="form-control" id="from_time" name="from_time" value="<?=$edit_data['from_time']?>" required>
                            </div>

                            <!-- To Time -->
                            <div class="col-lg-4 p-2">
                                <label for="to_time" class="form-label">To Time<span class="required text-danger">*</span></label>
                                <input type="time" class="form-control" id="to_time" name="to_time" value="<?=$edit_data['to_time']?>" required>
                            </div>
                            
                            <div class="col-lg-12 p-2 mt-1">
                                <label for="attachment" class="form-label">Attachment</label>
                                <div class="dropzone" id="attachment-dropzone"></div>
                            </div>
                            
                            <div class="col-12 p-2 form-group">
                                <label for="instruction" class="form-label">Instructions</label>
                                <textarea class="form-textarea editor" name="instruction" id="editor1"><?=$edit_data['instructions']?></textarea>
                            </div>
                    

                            <!-- Save Button -->
                            <div class="col-12 p-2">
                                <button class="btn btn-success float-end btn-save" type="submit">
                                    <i class="ri-check-fill"></i> Save
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
            url: "<?= base_url('admin/assignment/upload_attachment') ?>",
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

