<p class="text-muted mb-3">Showing students</p>

<!-- Search -->
<div class="mb-3 d-none">
<input type="text" id="studentSearch" class="form-control" placeholder="Search students...">
</div>

<!-- Selected Count -->
<div class="text-end mb-2">
<small class="text-muted"><span id="selectedCount">0</span> Students selected</small>
</div>
<form autocomplete="off" action="" id="addCohortLearnersForm1"  enctype="multipart/form-data">
    <div class="row">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    
                        

                        <!-- Select All -->
                        <div class="form-check mb-2 d-none">
                            <input type="checkbox" class="form-check-input" id="select_all">
                            <label for="select_all" class="form-check-label">Select All</label>
                        </div>

                        <input type="hidden" name="cohort_id" value="<?= $cohort_id ?>">

                        <!-- Student Table -->
                        <div class="table-responsive">
                        <table class="table align-middle mb-0">
                            <thead class="table-light">
                            <tr>
                                <th scope="col" style="width: 50px;">Select</th>
                                <th scope="col" style="width: 50px;">No</th>
                                <th scope="col">Students</th>
                            </tr>
                            </thead>
                            <tbody id="studentsTable">
                                <?php $i = 1; foreach ($learners as $learner): ?>
                                    <tr>
                                    <td>
                                    <input class="form-check-input student-checkbox" 
                                        type="checkbox" 
                                        name="student_id[]" 
                                        value="<?= $learner['user_id'] ?>">
                                    </td>
                                    <td><?= $i++ ?></td>
                                    <td class="d-flex align-items-center">
                                        <img src="<?= $learner['profile_picture'] ? base_url(get_file($learner['profile_picture'])) : base_url('assets/admin/images/place-holder/profile-place-holder.jpg') ?>" 
                                            alt="avatar" 
                                            class="rounded-circle me-2" 
                                            width="35" height="35">
                                        <span><?= esc($learner['name']) ?></span>
                                    </td>
                                    
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                        </div>
                    

                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary" id="learnersSubmitBtn">Assign Selected</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</form>


<style>
.table td, .table th {
  vertical-align: middle;
}
.table th {
  font-weight: 600;
  color: #555;
}
img.rounded-circle {
  object-fit: cover;
}
.form-check-input {
  cursor: pointer;
  width: 20px;
  height: 20px;
}


</style>
<script>
$(document).ready(function () {
        const searchInput = document.getElementById('studentSearch');
        const checkboxes = document.querySelectorAll('.student-checkbox');
        const selectedCount = document.getElementById('selectedCount');
        const rows = document.querySelectorAll('#studentsTable tr');

        // Search filter
        searchInput.addEventListener('keyup', function () {
            const term = this.value.toLowerCase();
            rows.forEach(row => {
                const name = row.textContent.toLowerCase();
                if(name.includes(term)){
                    row.classList.remove('d-none');
                }
                else{
                    row.classList.add('d-none');
                }
            });
        });

        // Count selected
        checkboxes.forEach(cb => {
            cb.addEventListener('change', function () {
                const checkedCount = document.querySelectorAll('.student-checkbox:checked').length;
                selectedCount.textContent = checkedCount;
            });
        });


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

        document.getElementById('select_all').addEventListener('change', function(){
            const checkboxes = document.querySelectorAll('input[name="student_id[]"]');
            checkboxes.forEach(cb => cb.checked = this.checked);
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


        $("#addCohortLearnersForm1").on("submit", function (e) {
            e.preventDefault();
            var form = this;
            var routeUrl = "<?= base_url('centre/Cohorts/add_cohort_students') ?>";
            ajax(form, routeUrl);
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
                            location.reload();
                            
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
    });
</script>