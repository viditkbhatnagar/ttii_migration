<form action="<?= base_url('app/fee_management/edit_installment/' . $edit_data['id']) ?>" method="post" onsubmit="return validateAmount()">
    <div class="row">

        <!-- Course Info Section -->
        <div class="col-12 mb-3">
            <div class="d-flex justify-content-between align-items-center p-3 border rounded bg-light">
                <div>
                    <h6 class="mb-1 text-muted">Total Course Amount</h6>
                    <h4 class="text-primary m-0">₹ <?= number_format($total_course_amount, 2) ?></h4>
                </div>
                <div>
                    <h6 class="mb-1 text-muted">Unassigned Installment Amount</h6>
                    <h4 class="text-danger m-0" id="unassigned_amount">₹ <?= number_format($not_added_amount, 2) ?></h4>
                </div>
            </div>
        </div>

        <!-- Installment Amount -->
        <div class="form-group mt-2">
            <label for="installment_amount" class="form-label">Installment Amount <span class="text-danger">*</span></label>
            <input type="number" class="form-control" id="installment_amount" name="installment_amount" 
                   placeholder="Enter installment amount" min="1" value="<?= $edit_data['installment_amount'] ?>" required max="<?= $not_added_amount ?>">
        </div>

        <!-- Payment Date -->
        <div class="form-group mt-2">
            <label for="due_date" class="form-label">Due Date <span class="text-danger">*</span></label>
            <input type="date" class="form-control" id="due_date" name="due_date" value="<?= $edit_data['due_date'] ?>" required>
        </div>

        <!-- Description -->
        <div class="form-group mt-2">
            <label for="remark" class="form-label">Remark</label>
            <textarea class="form-control" id="remark" name="remark" 
                      rows="3" placeholder="Enter remark (optional)"><?= $edit_data['remark'] ?></textarea>
        </div>

        <div class="col-12 form-group text-end mt-2">
            <button type="submit" class="btn btn-primary">Update Installment</button>
            <a href="<?= base_url('app/fee_management') ?>" class="btn btn-secondary">Cancel</a>
        </div>
    </div>
</form>

<script>
    function validateAmount() {
        const unassignedAmount = parseFloat(document.getElementById('unassigned_amount').innerText);
        const installmentAmount = parseFloat(document.getElementById('installment_amount').value);

        if (installmentAmount > unassignedAmount) {
            alert_modal_error(`Installment amount cannot exceed the unassigned amount (${unassignedAmount}).`);
            return false;
        }
        return true;
    }
</script>
