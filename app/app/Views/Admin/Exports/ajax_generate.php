<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
<form autocomplete="off" action="<?=base_url('app/exports/generate_csv')?>" method="post" class="needs-validation" novalidate enctype="multipart/form-data">
    <div class="row">
        <div class="col-lg-12">
            <input type="hidden" class="form-control" id="export_type_id" name="export_type_id" value="<?=$export_type_id?>">
            <div class="mb-3">
                <label for="title" class="form-label">Export Title<span class="required text-danger">*</span></label>
                <input type="text" class="form-control" id="title" name="title" value="<?=$export_type['title']?>"
                       placeholder="Export Title" required>
                <div class="invalid-feedback">Please Enter Export Title.</div>
            </div>

            <div class="row">
                <div class="mb-1">
                    <label for="employee_code" class="form-label">Export Period<span class="required text-danger">*</span></label>
                    <div class="mx-4">
                        <div class="form-check form-radio-outline form-radio-dark mb-3">
                            <input class="form-check-input" type="radio" name="export_period" id="yesterday" checked>
                            <label class="form-check-label" for="yesterday">
                                Yesterday
                            </label>
                        </div>
                        <div class="form-check form-radio-outline form-radio-dark mb-3">
                            <input class="form-check-input" type="radio" name="export_period" id="previous_week">
                            <label class="form-check-label" for="previous_week">
                                Previous week
                            </label>
                        </div>
                        <div class="form-check form-radio-outline form-radio-dark mb-3">
                            <input class="form-check-input" type="radio" name="export_period" id="previous_month">
                            <label class="form-check-label" for="previous_month">
                                Previous month
                            </label>
                        </div>
                        <div class="form-check form-radio-outline form-radio-dark mb-3">
                            <input class="form-check-input" type="radio" name="export_period" id="custom">
                            <label class="form-check-label" for="custom">
                                Custom
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-lg-6">
                    <div class="mb-3">
                        <label for="period_from" class="form-label">Period from<span class="required text-danger">*</span></label>
                        <input type="date" class="form-control" id="period_from" name="period_from" value="<?php echo date('Y-m-d', strtotime('-1 day')); ?>" required readonly>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="mb-3">
                        <label for="period_to" class="form-label">Period to<span class="required text-danger">*</span></label>
                        <input type="date" class="form-control" id="period_to" name="period_to" value="<?php echo date('Y-m-d', strtotime('-1 day')); ?>" required readonly>
                    </div>
                </div>
            </div>
            
            
            <div class="row">
                <div class="col-lg-6">
                    <div class="mb-3">
                        <label for="team_id" class="form-label">Choose Team<span class="required text-danger">*</span></label>
                        <select class="form-control select2" id="team_id" name="team_id[]" required onchange="getTeamMembers()" multiple>
                            <option value="0">All Teams</option>
                            <?php foreach($teams as $team){ ?>
                                <option value="<?=$team['id']?>" selected><?=$team['title']?></option>
                            <?php } ?>
                        </select>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="mb-3">
                        <label for="user_id" class="form-label">Choose Team<span class="required text-danger">*</span></label>
                        <select class="form-control select2" id="user_id" name="user_id[]" required multiple>
                            <option value="0">All Members</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="mb-1">
                    <label for="employee_code" class="form-label">Group by<span class="required text-danger">*</span></label>
                    <div class="mx-4">
                        <div class="form-check form-radio-outline form-radio-dark mb-3">
                            <input class="form-check-input" type="radio" name="group_by" id="daily" checked>
                            <label class="form-check-label" for="daily">
                                Daily
                            </label>
                        </div>
                        <div class="form-check form-radio-outline form-radio-dark mb-3">
                            <input class="form-check-input" type="radio" name="group_by" id="weekly">
                            <label class="form-check-label" for="weekly">
                                Weekly
                            </label>
                        </div>
                        <div class="form-check form-radio-outline form-radio-dark mb-3">
                            <input class="form-check-input" type="radio" name="group_by" id="monthly">
                            <label class="form-check-label" for="monthly">
                                Monthly
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="hstack gap-2 justify-content-end">
                <button class="btn btn-success float-end" type="submit">
                    <i class="ri-check-fill"></i>
                    Generate
                </button>
            </div>
        </div>
    </div>
</form>
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
<script>
    $(document).ready(function() {
        
    });
    $(document).ready(function () {
        // Function to handle radio button change event
        $("input[name='export_period']").change(function () {
            // Get the selected radio button's ID
            var selectedId = $(this).attr("id");
    
            // Disable date fields by default
            $("#period_from, #period_to").prop("readonly", true);
    
            // If 'Custom' is selected, enable date fields and make them required
            if (selectedId === "custom") {
                $("#period_from, #period_to").prop("readonly", false).prop("required", true);
            } else {
                // Handle other options (Yesterday, Previous week, Previous month) here
                // You can customize the logic for each option based on your requirements
                // For simplicity, I'm setting default values for 'Yesterday', 'Previous week', and 'Previous month'
                var today = new Date();
    
                if (selectedId === "yesterday") {
                    var yesterday = new Date(today);
                    yesterday.setDate(today.getDate() - 1);
                    $("#period_from").val(formatDate(yesterday));
                    $("#period_to").val(formatDate(yesterday));
                } else if (selectedId === "previous_week") {
                    var lastWeek = new Date(today);
                    lastWeek.setDate(today.getDate() - 7);
                    $("#period_from").val(formatDate(lastWeek));
                    $("#period_to").val(formatDate(today));
                } else if (selectedId === "previous_month") {
                    var lastMonth = new Date(today);
                    lastMonth.setMonth(today.getMonth() - 1);
                    $("#period_from").val(formatDate(lastMonth));
                    $("#period_to").val(formatDate(today));
                }
            }
        });
    
        // Helper function to format date as 'YYYY-MM-DD'
        function formatDate(date) {
            var year = date.getFullYear();
            var month = String(date.getMonth() + 1).padStart(2, '0');
            var day = String(date.getDate()).padStart(2, '0');
            return year + '-' + month + '-' + day;
        }
    
    });


    getTeamMembers();
    function getTeamMembers() {
        var teamIds = $('#team_id').val();
        $.ajax({
            url: '<?=base_url()?>app/team_members/get_team_members_by_team',
            type: 'POST',
            data: { 'team_id': teamIds }, 
            dataType: 'json',
            success: function(response) {
                // Clear existing options
                $('#user_id').empty();
                $('#user_id').append('<option value="0">All Members</option>');
                // Add new options based on the response
                $.each(response, function(index, member) {
                    $('#user_id').append('<option value="' + member.id + '" selected>' + member.name + '</option>');
                });
            },
            error: function(error) {
                console.error('Error fetching team members:', error);
            }
        });
    }

</script>

<style>
    input[readonly] {
        cursor: not-allowed;
        background-color: #f5f5f5; /* You can customize the background color */
        /* You can add additional styles as needed */
    }
</style>
