<form action="<?= base_url('admin/student_fee/edit/'.$edit_data['id']) ?>" method="post">
    <!--store student id-->
     <input type="text" class="d-none" id="user_id" name="user_id" value="<?= $edit_data['user_id'] ?>">
    <div class="row">

       

        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="installment_details" class="form-label">Installment Details</label>
                <input type="text" class="form-control" id="installment_details" name="installment_details" required 
                    value="<?= isset($edit_data['installment_details']) ? $edit_data['installment_details'] : '' ?>">
            </div>
        </div>

         <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="course" class="form-label">Enrolled Course</label>
                <select class="form-control" id="course" name="course_id" required>
                    <option value="">Select Course</option>
                    <?php foreach ($courses as $course) : ?>
                        <option value="<?= $course['id'] ?>" <?= isset($edit_data['course_id']) && $edit_data['course_id'] == $course['id'] ? 'selected' : '' ?>><?= $course['title'] ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
        </div>
        
        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="amount" class="form-label">Amount</label>
                <input type="number" class="form-control" id="amount" name="amount" placeholder="INR" required 
                    value="<?= isset($edit_data['amount']) ? $edit_data['amount'] : '' ?>">
            </div>
        </div>

        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="due_date" class="form-label">Due Date</label>
                <input type="date" class="form-control" id="due_date" name="due_date" required 
                    value="<?= isset($edit_data['due_date']) ? $edit_data['due_date'] : '' ?>">
            </div>
        </div>

        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="payment_mode" class="form-label">Mode of Payment</label>
                <select class="form-control" id="payment_mode" name="payment_mode" required>
                    <option value="">Select Mode</option>
                    <option value="Online" <?= isset($edit_data['payment_mode']) && $edit_data['payment_mode'] == 'Online' ? 'selected' : '' ?>>Online</option>
                    <option value="Cash" <?= isset($edit_data['payment_mode']) && $edit_data['payment_mode'] == 'Cash' ? 'selected' : '' ?>>Cash</option>
                    <option value="Cheque" <?= isset($edit_data['payment_mode']) && $edit_data['payment_mode'] == 'Cheque' ? 'selected' : '' ?>>Cheque</option>
                </select>
            </div>
        </div>

        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="payment_to" class="form-label">Payment To</label>
                <select class="form-control" id="payment_to" name="payment_to" required>
                    <option value="">-- Select any --</option>
                    <option value="ttii" <?= isset($edit_data['payment_to']) && $edit_data['payment_to'] == 'ttii' ? 'selected' : '' ?>>TTII</option>
                </select>
            </div>
        </div>

        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="status" class="form-label">Status</label>
                <select class="form-control" id="payment_status" name="status" required>
                    <option value="">Select Status</option>
                    <option value="Paid" <?= isset($edit_data['status']) && $edit_data['status'] == 'Paid' ? 'selected' : '' ?>>Paid</option>
                    <option value="Pending" <?= isset($edit_data['status']) && $edit_data['status'] == 'Pending' ? 'selected' : '' ?>>Pending</option>
                    <!--<option value="Due" <?= isset($edit_data['status']) && $edit_data['status'] == 'Due' ? 'selected' : '' ?>>Due</option>-->
                    <!--<option value="Over Due" <?= isset($edit_data['status']) && $edit_data['status'] == 'Over Due' ? 'selected' : '' ?>>Over Due</option>-->
                </select>
            </div>
        </div>

        <!-- Payment Date Field (Hidden by default) -->
        <div class="col-12 col-md-6" id="payment_date_div" style="display: none;">
            <div class="form-group">
                <label for="payment_date" class="form-label">Payment Date</label>
                <input type="date" class="form-control" id="payment_date" name="payment_date" value="<?= isset($edit_data['paid_date']) ? $edit_data['paid_date'] : '' ?>" >
            </div>
        </div>


        <div class="col-12">
            <div class="text-end mt-3">
                <button type="submit" class="btn btn-success">
                    <i class="ri-check-fill me-1"></i>Update
                </button>
            </div>
        </div>
    </div>
</form>
<script>
    
    function togglePaymentDate() {
        let statusSelect = document.getElementById("payment_status");
        let paymentDateDiv = document.getElementById("payment_date_div");


        if (statusSelect.value === "Paid") {
            paymentDateDiv.style.display = "block";
        } else {
            paymentDateDiv.style.display = "none";
            document.getElementById("payment_date").value = ""; // clear if hidden
        }
    }

    // Initial check (useful for edit mode)
    

    // On change event
    statusSelect.addEventListener("change", togglePaymentDate);
</script>
<script>
    $(document).ready(function () {
        togglePaymentDate();
        $(document).off('change', '#payment_status'); // remove duplicate handlers
        $(document).on('change', '#payment_status', function () {
            togglePaymentDate();
        });
    });
</script>