<form autocomplete="off" action="<?= base_url('admin/live_class/add') ?>" id="addVimeoLinkForm" method="post" enctype="multipart/form-data">
    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    <div class="live-preview">
                        <input type="hidden" name="live_class_id" value="<?= $live_class_id ?>"> 
                        
                        <div class="row">
                            
                            <div class="col-lg-6 p-2">
                                <label class="form-label">Vimeo Link<span class="required text-danger">*</span></label>
                                <input type="text" class="form-control" name="vimeo_url" required value="<?= $video_url ?>">
                            </div>


                            <div class="d-flex align-items-start gap-3 mt-4">
                                <button type="submit" id="recordedClassSubmitBtn" class="btn btn-success btn-label right ms-auto nexttab">Save</button>
                            </div>
                        </div> <!-- end row -->
                    </div>
                </div>
            </div>
        </div>
    </div>
</form>


<script>
$(document).ready(function () {
    // Hide the repeat dates section initially
    $('#repeat_dates_section').hide();

    // Show/Hide the repeat dates section when checkbox is clicked
    $('#is_repetitive').change(function () {
        if ($(this).is(':checked')) {
            $('#repeat_dates_section').slideDown();
        } else {
            $('#repeat_dates_section').slideUp();
            $("#date_fields").html(`
                <div class="input-group mb-2">
                    <input type="date" name="repeat_dates[]" class="form-control">
                    <button type="button" class="btn btn-success add_date"><b>+</b></button>
                </div>
            `); // Reset to one field
        }
    });

    // Add a new date input field
    $(document).on('click', '.add_date', function () {
        let newField = `
            <div class="input-group mb-2">
                <input type="date" name="repeat_dates[]" class="form-control">
                <button type="button" class="btn btn-danger remove_date"><b>-</b></button>
            </div>
        `;
        $("#date_fields").append(newField);
    });

    // Remove a date input field
    $(document).on('click', '.remove_date', function () {
        $(this).closest('.input-group').remove();
    });
});

$("#recordedClassSubmitBtn").on("click", function (e) {
    e.preventDefault();

    var form = document.getElementById("addVimeoLinkForm");
    
    var routeUrl = "<?=base_url('admin/Live_class/addVimeo')?>";
    
    ajax(form,routeUrl);
    
});

        function ajax(form,routeUrl) {
            var formData = new FormData(form);
            $.ajax({
                url: routeUrl, 
                type: "POST",
                data: formData,
                processData: false,
                contentType: false,
                dataType: "json",
                success: function (response) {
                    if (response.success) { 
                        Swal.fire({
                            icon: "success",
                            title: "Success!",
                            text: response.message,
                            timer: 2000,
                            showConfirmButton: false
                        }).then(() => {
                            $('#ajax_modal').modal('hide');
                            
                        });
                    } else {
                        Swal.fire({
                            icon: "error",
                            title: "Error!",
                            text: response.message || "Something went wrong!",
                        });
                    }
                },
                error: function () {
                    Swal.fire({
                        icon: "error",
                        title: "Error!",
                        text: "Failed to submit data. Please try again.",
                    });
                }
            });  
        }
</script>